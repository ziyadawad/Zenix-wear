'use server';
import { revalidatePath, updateTag } from 'next/cache';
import { after } from 'next/server';
import { z } from 'zod';
import { db, newId } from '@/lib/db';
import { checkOrderToken, clientIp, currentUserId, orderToken, rateLimit } from '@/lib/auth';
import { cardProps, filterProducts, getCatalog, getSettings } from '@/lib/catalog';
import { findOrderByNumber, OrderError, placeOrder, quoteCart, type CartLine, type Quote } from '@/lib/orders';
import { createPaymobCheckout, notifyNewOrder, paymobEnabled, saveImage, sendEmail, UploadError } from '@/lib/services';
import { effectivePrice, isEgPhone, normalizePhone, SITE_URL } from '@/lib/utils';
import type { Order, OrderStatus, PaymentMethod } from '@/lib/types';

export interface SearchHit { slug: string; nameAr: string; nameEn: string; image: string; price: number }
export async function searchProducts(q: string): Promise<SearchHit[]> {
  const list = filterProducts(await getCatalog(), { q: q.slice(0, 60), sort: 'best' }).slice(0, 12);
  return list.map((p) => ({ slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, image: p.colors[0]?.images[0] ?? '', price: effectivePrice(p) }));
}

/** Product cards for ids kept in the browser (wishlist, recently viewed), in the same order. */
export async function getCards(ids: string[]) {
  const all = await getCatalog();
  return ids.slice(0, 60).map((id) => all.find((p) => p.id === id)).filter((p) => p != null).map(cardProps);
}

const cartLines = z.array(z.object({
  productId: z.string().max(100), colorId: z.string().max(50), size: z.string().max(10), qty: z.number().int().min(1).max(50),
})).max(50);

export async function getQuote(lines: CartLine[], opts: { promo?: string; governorate?: string; phone?: string }): Promise<Quote> {
  const parsed = cartLines.parse(lines);
  return quoteCart(parsed, { promo: opts.promo?.slice(0, 40), governorate: opts.governorate?.slice(0, 40), phone: opts.phone ? normalizePhone(opts.phone) : undefined });
}

// ---- Checkout -----------------------------------------------------------------------------------
export type CheckoutField = 'name' | 'phone' | 'altPhone' | 'email' | 'governorate' | 'city' | 'address' | 'proof' | 'proofType';
export type CheckoutResult =
  | { ok: true; redirect: string; number: string; total: number }
  | { ok: false; fields?: Partial<Record<CheckoutField, true>>; error?: 'stock' | 'empty' | 'promo' | 'rate' | 'server'; detail?: string };

const optional = z.string().trim().max(300).optional();
const checkoutSchema = z.object({
  name: z.string().trim().min(3).max(120),
  phone: z.string().refine(isEgPhone),
  altPhone: z.string().optional().refine((v) => !v || isEgPhone(v)),
  email: z.union([z.literal(''), z.string().trim().email().max(200)]).optional(),
  governorate: z.string().min(2).max(40),
  city: z.string().trim().min(2).max(120),
  address: z.string().trim().min(8).max(400),
  notes: optional,
  paymentMethod: z.enum(['cod', 'instapay', 'wallet', 'card']),
  promo: z.string().trim().max(40).optional(),
  locale: z.enum(['ar', 'en']),
});

export async function submitCheckout(form: FormData): Promise<CheckoutResult> {
  if (!(await rateLimit(`checkout:${await clientIp()}`, 12, 3600))) return { ok: false, error: 'rate' };

  const raw = Object.fromEntries(['name', 'phone', 'altPhone', 'email', 'governorate', 'city', 'address', 'notes', 'paymentMethod', 'promo', 'locale'].map((k) => [k, (form.get(k) as string) ?? undefined]));
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Partial<Record<CheckoutField, true>> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0]) as CheckoutField] = true;
    return { ok: false, fields };
  }
  const d = parsed.data;
  let lines: CartLine[];
  try { lines = cartLines.parse(JSON.parse(String(form.get('lines')))); } catch { return { ok: false, error: 'empty' }; }
  if (!lines.length) return { ok: false, error: 'empty' };
  if (d.paymentMethod === 'card' && !paymobEnabled()) return { ok: false, error: 'server' };

  let proof: string | null = null;
  if (d.paymentMethod === 'instapay' || d.paymentMethod === 'wallet') {
    const f = form.get('proof');
    if (!(f instanceof File) || f.size === 0) return { ok: false, fields: { proof: true } };
    try { proof = await saveImage(f, 'private'); } catch (e) {
      if (e instanceof UploadError && (e.message === 'too-large' || e.message === 'bad-type' || e.message === 'empty')) return { ok: false, fields: { proofType: true } };
      console.error('[checkout] screenshot upload failed', e);
      return { ok: false, error: 'server' };
    }
  }

  let order: Order;
  try {
    order = await placeOrder({
      customerId: await currentUserId(), name: d.name, phone: normalizePhone(d.phone), altPhone: d.altPhone ? normalizePhone(d.altPhone) : undefined,
      email: d.email || undefined, governorate: d.governorate, city: d.city, address: d.address, notes: d.notes,
      paymentMethod: d.paymentMethod as PaymentMethod, paymentProof: proof, promo: d.promo, lines, locale: d.locale,
    });
  } catch (e) {
    if (e instanceof OrderError) {
      if (e.code === 'governorate') return { ok: false, fields: { governorate: true } };
      return { ok: false, error: e.code, detail: e.detail };
    }
    console.error('[checkout] order failed', e);
    return { ok: false, error: 'server' };
  }

  updateTag('catalog');
  revalidatePath('/[locale]/product/[slug]', 'page');
  after(() => notifyNewOrder(order));

  const t = orderToken(order.number);
  const confirmUrl = `/${d.locale}/order/${order.number}?t=${t}`;
  if (d.paymentMethod === 'card') {
    try {
      const url = await createPaymobCheckout(order, `${SITE_URL}${confirmUrl}`);
      return { ok: true, redirect: url, number: order.number, total: order.total };
    } catch (e) {
      console.error('[checkout] paymob failed', e);
      return { ok: true, redirect: `${confirmUrl}&pay=failed`, number: order.number, total: order.total };
    }
  }
  return { ok: true, redirect: confirmUrl, number: order.number, total: order.total };
}

export async function getOrderForConfirmation(number: string, token: string | undefined) {
  if (!checkOrderToken(number, token)) return null;
  return findOrderByNumber(number);
}

// ---- Track order -------------------------------------------------------------------------------
export interface TrackView { number: string; status: OrderStatus; total: number; createdAt: string; governorate: string; history: Order['history']; items: { nameAr: string; nameEn: string; size: string; qty: number; image: string; colorAr: string; colorEn: string }[] }
export async function trackOrder(number: string, phone: string): Promise<{ ok: true; order: TrackView } | { ok: false; error: 'notFound' | 'rate' }> {
  if (!(await rateLimit(`track:${await clientIp()}`, 15, 600))) return { ok: false, error: 'rate' };
  const o = await findOrderByNumber(number.slice(0, 20));
  if (!o || o.phone !== normalizePhone(phone)) return { ok: false, error: 'notFound' };
  return {
    ok: true,
    order: {
      number: o.number, status: o.status, total: o.total, createdAt: o.createdAt, governorate: o.governorate, history: o.history,
      items: o.items.map((i) => ({ nameAr: i.nameAr, nameEn: i.nameEn, size: i.size, qty: i.qty, image: i.image, colorAr: i.colorAr, colorEn: i.colorEn })),
    },
  };
}

// ---- Small forms --------------------------------------------------------------------------------
export async function subscribeNewsletter(email: string): Promise<{ ok: boolean; code?: string }> {
  const e = z.string().trim().toLowerCase().email().max(200).safeParse(email);
  if (!e.success) return { ok: false };
  if (!(await rateLimit(`news:${await clientIp()}`, 10, 3600))) return { ok: false };
  await db.query('INSERT INTO newsletter (email) VALUES ($1) ON CONFLICT DO NOTHING', [e.data]);
  return { ok: true, code: 'WELCOME10' };
}

export async function submitReview(input: { productId: string; name: string; city?: string; rating: number; body: string }): Promise<{ ok: boolean }> {
  const r = z.object({
    productId: z.string().max(100), name: z.string().trim().min(2).max(60), city: z.string().trim().max(60).optional(),
    rating: z.number().int().min(1).max(5), body: z.string().trim().min(5).max(1000),
  }).safeParse(input);
  if (!r.success) return { ok: false };
  if (!(await rateLimit(`review:${await clientIp()}`, 5, 3600))) return { ok: false };
  const exists = await db.query('SELECT 1 FROM products WHERE id = $1', [r.data.productId]);
  if (!exists.length) return { ok: false };
  await db.query(`INSERT INTO reviews (id,product_id,name,city,rating,body,status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`, [newId(), r.data.productId, r.data.name, r.data.city || null, r.data.rating, r.data.body]);
  return { ok: true };
}

export async function submitStockAlert(input: { productId: string; colorId: string; size: string; contact: string }): Promise<{ ok: boolean }> {
  const contact = input.contact.trim().slice(0, 200);
  const valid = isEgPhone(contact) || z.string().email().safeParse(contact).success;
  if (!valid) return { ok: false };
  if (!(await rateLimit(`alert:${await clientIp()}`, 15, 3600))) return { ok: false };
  const stored = isEgPhone(contact) ? normalizePhone(contact) : contact.toLowerCase();
  await db.query(
    `INSERT INTO stock_alerts (id,product_id,color_id,size,contact) SELECT $1,$2,$3,$4,$5 WHERE EXISTS (SELECT 1 FROM products WHERE id = $2) ON CONFLICT DO NOTHING`,
    [newId(), input.productId.slice(0, 100), input.colorId.slice(0, 50), input.size.slice(0, 10), stored],
  );
  return { ok: true };
}

export async function submitContact(input: { name: string; phone?: string; email?: string; body: string }): Promise<{ ok: boolean; error?: 'invalid' | 'rate' }> {
  const r = z.object({ name: z.string().trim().min(2).max(100), phone: z.string().trim().max(30).optional(), email: z.string().trim().max(200).optional(), body: z.string().trim().min(5).max(3000) }).safeParse(input);
  if (!r.success) return { ok: false, error: 'invalid' };
  const phoneOk = r.data.phone ? isEgPhone(r.data.phone) : false;
  const emailOk = r.data.email ? z.string().email().safeParse(r.data.email).success : false;
  if (!phoneOk && !emailOk) return { ok: false, error: 'invalid' };
  if (!(await rateLimit(`contact:${await clientIp()}`, 5, 3600))) return { ok: false, error: 'rate' };
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  await db.query('INSERT INTO messages (id,name,phone,email,body) VALUES ($1,$2,$3,$4,$5)', [newId(), r.data.name, phoneOk ? normalizePhone(r.data.phone!) : null, emailOk ? r.data.email : null, r.data.body]);
  after(() => sendEmail(process.env.ORDER_NOTIFY_EMAIL || 'ziyadawad14@gmail.com', `New message from ${r.data.name}`, `<p><b>${esc(r.data.name)}</b> ${esc(r.data.phone ?? '')} ${esc(r.data.email ?? '')}</p><p>${esc(r.data.body)}</p>`));
  return { ok: true };
}

export async function getCheckoutConfig() {
  const s = await getSettings();
  return { instapayHandle: s.instapayHandle, walletNumber: s.walletNumber, cardEnabled: paymobEnabled() };
}
