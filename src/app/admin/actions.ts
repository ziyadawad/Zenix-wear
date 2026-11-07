'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, newId } from '@/lib/db';
import { checkAdminCredentials, clientIp, endAdminSession, rateLimit, requireAdmin, startAdminSession } from '@/lib/auth';
import { OrderError, setOrderStatus } from '@/lib/orders';
import { saveImage, UploadError } from '@/lib/services';
import { CATEGORIES, FITS, GENDERS, ORDER_STATUSES, SIZES, TAGS } from '@/lib/types';
import { DEFAULT_CONTENT, DEFAULT_SETTINGS } from '@/lib/db/seed';
import { slugify } from '@/lib/utils';

function refreshStorefront(...tags: string[]) {
  tags.forEach((t) => updateTag(t));
  revalidatePath('/[locale]', 'layout');
}

// ---- Session ----------------------------------------------------------------------------------
export async function adminLogin(_: unknown, form: FormData): Promise<{ error: string } | null> {
  const ip = await clientIp();
  if (!(await rateLimit(`admin-login:${ip}`, 6, 900))) return { error: 'Too many attempts. Try again in 15 minutes.' };
  const ok = await checkAdminCredentials(String(form.get('email') ?? ''), String(form.get('password') ?? ''));
  if (!ok) return { error: 'Wrong email or password.' };
  await startAdminSession();
  redirect('/admin');
}
export async function adminLogout() {
  await endAdminSession();
  redirect('/admin/login');
}

// ---- Uploads ----------------------------------------------------------------------------------
export async function uploadImage(form: FormData): Promise<{ url?: string; error?: string }> {
  await requireAdmin();
  const f = form.get('file');
  if (!(f instanceof File)) return { error: 'No file received.' };
  try {
    return { url: await saveImage(f, 'public') };
  } catch (e) {
    if (e instanceof UploadError) {
      if (e.message === 'too-large') return { error: 'Image must be under 5 MB.' };
      if (e.message === 'bad-type') return { error: 'Use a JPG, PNG or WEBP image.' };
      if (e.message === 'storage-not-configured') return { error: 'Image storage is not configured. Connect a Vercel Blob store to this project.' };
      return { error: `Upload failed (${e.message}).` };
    }
    console.error(e);
    return { error: 'Upload failed.' };
  }
}

// ---- Products ---------------------------------------------------------------------------------
const imageUrl = z.string().max(600).refine((s) => s.startsWith('/') || s.startsWith('https://'));
const color = z.object({
  id: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  nameAr: z.string().trim().min(1).max(40), nameEn: z.string().trim().min(1).max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  images: z.array(imageUrl).max(12),
  stock: z.record(z.string(), z.number().int().min(0).max(100000)),
});
const productSchema = z.object({
  id: z.string().max(100).nullable(),
  slug: z.string().trim().max(90), sku: z.string().trim().min(1).max(40),
  nameAr: z.string().trim().min(1).max(160), nameEn: z.string().trim().min(1).max(160),
  descAr: z.string().max(4000), descEn: z.string().max(4000),
  fabricAr: z.string().max(2000), fabricEn: z.string().max(2000), careAr: z.string().max(2000), careEn: z.string().max(2000), fitAr: z.string().max(1000), fitEn: z.string().max(1000),
  price: z.number().int().min(0).max(1000000), salePrice: z.number().int().min(0).max(1000000).nullable(),
  category: z.enum(CATEGORIES), fit: z.enum(FITS).nullable(), gender: z.enum(GENDERS), collection: z.string().max(60).nullable(),
  tags: z.array(z.enum(TAGS)), status: z.enum(['active', 'draft']), featured: z.boolean(),
  video: z.string().max(600).nullable(),
  sizes: z.array(z.enum(SIZES)).min(1),
  colors: z.array(color).min(1).max(20),
});
export type ProductInput = z.infer<typeof productSchema>;

export async function saveProduct(input: ProductInput): Promise<{ ok: boolean; error?: string; id?: string }> {
  await requireAdmin();
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { ok: false, error: `Check "${i.path.join(' > ')}": ${i.message}` };
  }
  const p = parsed.data;
  if (p.salePrice != null && p.salePrice >= p.price) return { ok: false, error: 'Sale price must be lower than the price.' };
  if (new Set(p.colors.map((c) => c.id)).size !== p.colors.length) return { ok: false, error: 'Two colours have the same name. Give each colour its own English name.' };
  if (p.status === 'active' && p.colors.some((c) => !c.images.length)) return { ok: false, error: 'Every colour needs at least one image before the product can go live.' };
  const slug = slugify(p.slug || p.nameEn);
  if (!slug) return { ok: false, error: 'Add an English name so the product gets a clean URL.' };
  const id = p.id ?? newId();
  const dupe = await db.query('SELECT 1 FROM products WHERE slug = $1 AND id <> $2', [slug, id]);
  if (dupe.length) return { ok: false, error: `Another product already uses the URL "${slug}". Change the URL field.` };
  const colors = p.colors.map(({ id: cid, nameAr, nameEn, hex, images }) => ({ id: cid, nameAr, nameEn, hex, images }));
  const collection = p.collection || null;

  await db.tx(async (tx) => {
    const values = [id, slug, p.sku, p.nameAr, p.nameEn, p.descAr, p.descEn, p.fabricAr, p.fabricEn, p.careAr, p.careEn, p.fitAr, p.fitEn, p.price, p.salePrice, p.category, p.fit, p.gender, collection, JSON.stringify(p.tags), JSON.stringify(colors), p.video || null, p.status, p.featured];
    await tx.query(
      `INSERT INTO products (id,slug,sku,name_ar,name_en,desc_ar,desc_en,fabric_ar,fabric_en,care_ar,care_en,fit_ar,fit_en,price,sale_price,category,fit,gender,collection,tags,colors,video,status,featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21::jsonb,$22,$23,$24)
       ON CONFLICT (id) DO UPDATE SET slug=$2,sku=$3,name_ar=$4,name_en=$5,desc_ar=$6,desc_en=$7,fabric_ar=$8,fabric_en=$9,care_ar=$10,care_en=$11,fit_ar=$12,fit_en=$13,price=$14,sale_price=$15,category=$16,fit=$17,gender=$18,collection=$19,tags=$20::jsonb,colors=$21::jsonb,video=$22,status=$23,featured=$24,updated_at=now()`,
      values,
    );
    await tx.query('DELETE FROM product_variants WHERE product_id = $1', [id]);
    for (const c of p.colors) {
      for (const s of p.sizes) {
        await tx.query('INSERT INTO product_variants (product_id,color_id,size,stock) VALUES ($1,$2,$3,$4)', [id, c.id, s, c.stock[s] ?? 0]);
      }
    }
  });
  refreshStorefront('catalog');
  return { ok: true, id };
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  await db.query('DELETE FROM products WHERE id = $1', [id]);
  refreshStorefront('catalog', 'reviews');
  redirect('/admin/products');
}

// ---- Orders -----------------------------------------------------------------------------------
export async function changeOrderStatus(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return { ok: false, error: 'Unknown status.' };
  try {
    await setOrderStatus(id, status);
  } catch (e) {
    if (e instanceof OrderError && e.code === 'stock') return { ok: false, error: `Not enough stock of ${e.detail} to reopen this order.` };
    throw e;
  }
  refreshStorefront('catalog');
  revalidatePath('/admin/orders');
  return { ok: true };
}
export async function setPaymentStatus(id: string, status: 'paid' | 'unpaid') {
  await requireAdmin();
  await db.query('UPDATE orders SET payment_status = $1 WHERE id = $2', [status, id]);
  revalidatePath(`/admin/orders/${id}`);
}

// ---- Promo codes ------------------------------------------------------------------------------
const promoSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,30}$/),
  type: z.enum(['percent', 'fixed']), value: z.coerce.number().int().min(1).max(1000000),
  minSubtotal: z.coerce.number().int().min(0).default(0),
  expiresAt: z.string().optional(), usageLimit: z.string().optional(), firstOrderOnly: z.boolean(),
});
export async function createPromo(_: unknown, form: FormData): Promise<{ error?: string; ok?: boolean }> {
  await requireAdmin();
  const r = promoSchema.safeParse({
    code: form.get('code'), type: form.get('type'), value: form.get('value'), minSubtotal: form.get('minSubtotal') || 0,
    expiresAt: (form.get('expiresAt') as string) || undefined, usageLimit: (form.get('usageLimit') as string) || undefined, firstOrderOnly: form.get('firstOrderOnly') === 'on',
  });
  if (!r.success) return { error: 'Check the form. Codes use 3 to 30 letters, numbers, - or _.' };
  const d = r.data;
  if (d.type === 'percent' && d.value > 100) return { error: 'A percentage cannot be above 100.' };
  // A date picked in the form means the end of that day in Cairo.
  const expires = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59+02:00`).toISOString() : null;
  const inserted = await db.query(
    `INSERT INTO promo_codes (code,type,value,min_subtotal,expires_at,usage_limit,first_order_only) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (code) DO NOTHING RETURNING code`,
    [d.code, d.type, d.value, d.minSubtotal, expires, d.usageLimit ? Number(d.usageLimit) : null, d.firstOrderOnly],
  );
  if (!inserted.length) return { error: 'That code already exists.' };
  revalidatePath('/admin/promos');
  return { ok: true };
}
export async function togglePromo(code: string, active: boolean) {
  await requireAdmin();
  await db.query('UPDATE promo_codes SET active = $1 WHERE code = $2', [active, code]);
  revalidatePath('/admin/promos');
}
export async function deletePromo(code: string) {
  await requireAdmin();
  await db.query('DELETE FROM promo_codes WHERE code = $1', [code]);
  revalidatePath('/admin/promos');
}

// ---- Shipping ---------------------------------------------------------------------------------
export async function saveShipping(fees: Record<string, number>): Promise<{ ok: boolean }> {
  await requireAdmin();
  const parsed = z.record(z.string().max(40), z.number().int().min(0).max(100000)).safeParse(fees);
  if (!parsed.success) return { ok: false };
  await db.tx(async (tx) => {
    for (const [id, fee] of Object.entries(parsed.data)) await tx.query('UPDATE shipping_rates SET fee = $1 WHERE id = $2', [fee, id]);
  });
  updateTag('shipping');
  return { ok: true };
}

// ---- Content & settings -----------------------------------------------------------------------
const localized = z.object({ ar: z.string().trim().max(200), en: z.string().trim().max(200) });
const contentSchema = z.object({
  hero: z.array(z.object({
    id: z.string().max(60), kind: z.enum(['figure', 'cover']), image: imageUrl, video: z.string().max(600).optional(),
    headlineAr: z.string().max(120), headlineEn: z.string().max(120), subAr: z.string().max(240), subEn: z.string().max(240),
  })).min(1).max(6),
  announcements: z.array(localized).max(8),
  featuredCollection: z.string().max(60),
  featuredCollectionImage: z.string().max(600),
  bestSellerIds: z.array(z.string().max(100)).max(12),
  community: z.array(imageUrl).max(6),
  categoryImages: z.record(z.string().max(30), imageUrl),
});
export async function saveContent(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = contentSchema.safeParse(input);
  if (!r.success) return { ok: false, error: `Check "${r.error.issues[0].path.join(' > ')}".` };
  await db.query(`INSERT INTO settings (key,value) VALUES ('content',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`, [JSON.stringify({ ...DEFAULT_CONTENT, ...r.data })]);
  refreshStorefront('content');
  return { ok: true };
}
const trackId = z.string().trim().regex(/^[A-Za-z0-9_-]{0,40}$/);
const link = z.union([z.literal(''), z.string().trim().url().max(300).refine((s) => s.startsWith('https://') || s.startsWith('http://'))]);
const settingsSchema = z.object({
  freeShippingThreshold: z.number().int().min(0).max(10000000),
  instagram: link, tiktok: link, facebook: link,
  instapayHandle: z.string().trim().max(80), walletNumber: z.string().trim().max(30),
  metaPixelId: trackId, tiktokPixelId: trackId, gaId: trackId,
});
export async function saveSettings(input: unknown): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const r = settingsSchema.safeParse(input);
  if (!r.success) return { ok: false, error: `Check "${r.error.issues[0].path.join(' > ')}".` };
  await db.query(`INSERT INTO settings (key,value) VALUES ('site',$1::jsonb) ON CONFLICT (key) DO UPDATE SET value = $1::jsonb`, [JSON.stringify({ ...DEFAULT_SETTINGS, ...r.data })]);
  refreshStorefront('content');
  return { ok: true };
}

// ---- Reviews ----------------------------------------------------------------------------------
export async function moderateReview(id: string, patch: { status?: 'approved' | 'rejected'; onHome?: boolean; image?: string | null }) {
  await requireAdmin();
  if (patch.status) await db.query('UPDATE reviews SET status = $1 WHERE id = $2', [patch.status, id]);
  if (patch.onHome != null) await db.query('UPDATE reviews SET on_home = $1 WHERE id = $2', [patch.onHome, id]);
  if (patch.image !== undefined) await db.query('UPDATE reviews SET image = $1 WHERE id = $2', [patch.image, id]);
  refreshStorefront('reviews', 'catalog');
  revalidatePath('/admin/reviews');
}
export async function deleteReview(id: string) {
  await requireAdmin();
  await db.query('DELETE FROM reviews WHERE id = $1', [id]);
  refreshStorefront('reviews', 'catalog');
  revalidatePath('/admin/reviews');
}
export async function removeDemoReviews() {
  await requireAdmin();
  await db.query('DELETE FROM reviews WHERE is_demo = true');
  refreshStorefront('reviews', 'catalog');
  revalidatePath('/admin');
  revalidatePath('/admin/reviews');
}

// ---- Inbox ------------------------------------------------------------------------------------
export async function markMessageRead(id: string) {
  await requireAdmin();
  await db.query('UPDATE messages SET is_read = true WHERE id = $1', [id]);
  revalidatePath('/admin/inbox');
}
export async function deleteStockAlert(id: string) {
  await requireAdmin();
  await db.query('DELETE FROM stock_alerts WHERE id = $1', [id]);
  revalidatePath('/admin/inbox');
}
