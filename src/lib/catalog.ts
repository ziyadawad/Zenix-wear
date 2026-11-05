import 'server-only';
import { unstable_cache } from 'next/cache';
import { db, type Row } from './db';
import type { Collection, Product, Review, ShippingRate, SiteContent, SiteSettings } from './types';
import { DEFAULT_CONTENT, DEFAULT_SETTINGS } from './db/seed';
import { effectivePrice, sizesOf, sortSizes, stockOf, totalStock } from './utils';

export function toProduct(r: Row, variants: Product['variants'] = [], rating = 0, reviewCount = 0): Product {
  return {
    id: r.id, slug: r.slug, sku: r.sku,
    nameAr: r.name_ar, nameEn: r.name_en, descAr: r.desc_ar, descEn: r.desc_en,
    fabricAr: r.fabric_ar, fabricEn: r.fabric_en, careAr: r.care_ar, careEn: r.care_en, fitAr: r.fit_ar, fitEn: r.fit_en,
    price: r.price, salePrice: r.sale_price, category: r.category, fit: r.fit, gender: r.gender, collection: r.collection,
    tags: r.tags, colors: r.colors, video: r.video, status: r.status, featured: r.featured, soldCount: r.sold_count,
    createdAt: new Date(r.created_at).toISOString(), variants, rating, reviewCount,
  };
}

export async function loadProducts(where = "p.status = 'active'", params: unknown[] = []): Promise<Product[]> {
  const rows = await db.query(`SELECT p.* FROM products p WHERE ${where} ORDER BY p.created_at DESC`, params);
  if (!rows.length) return [];
  const [variants, ratings] = await Promise.all([
    db.query('SELECT product_id, color_id, size, stock FROM product_variants'),
    db.query(`SELECT product_id, avg(rating)::float8 AS rating, count(*)::int AS n FROM reviews WHERE status = 'approved' AND product_id IS NOT NULL GROUP BY product_id`),
  ]);
  const vmap = new Map<string, Product['variants']>();
  for (const v of variants) {
    if (!vmap.has(v.product_id)) vmap.set(v.product_id, []);
    vmap.get(v.product_id)!.push({ colorId: v.color_id, size: v.size, stock: v.stock });
  }
  const rmap = new Map(ratings.map((r) => [r.product_id, r]));
  return rows.map((r) => toProduct(r, vmap.get(r.id) ?? [], rmap.get(r.id)?.rating ?? 0, rmap.get(r.id)?.n ?? 0));
}

const TTL = { revalidate: 300 };
/** Whole catalogue, cached and invalidated on any admin edit or order. Small enough to filter in memory. */
export const getCatalog = unstable_cache(() => loadProducts(), ['catalog-v1'], { ...TTL, tags: ['catalog'] });

export const getProduct = async (slug: string) => (await getCatalog()).find((p) => p.slug === slug) ?? null;

export const getCollections = unstable_cache(
  async (): Promise<Collection[]> => {
    const rows = await db.query('SELECT * FROM collections ORDER BY sort');
    return rows.map((r) => ({ slug: r.slug, nameAr: r.name_ar, nameEn: r.name_en, storyAr: r.story_ar, storyEn: r.story_en, image: r.image, sort: r.sort }));
  },
  ['collections-v1'], { ...TTL, tags: ['catalog'] },
);

export const getShippingRates = unstable_cache(
  async (): Promise<ShippingRate[]> => {
    const rows = await db.query('SELECT * FROM shipping_rates ORDER BY sort');
    return rows.map((r) => ({ id: r.id, nameAr: r.name_ar, nameEn: r.name_en, fee: r.fee, sort: r.sort }));
  },
  ['shipping-v1'], { ...TTL, tags: ['shipping'] },
);

async function readSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await db.query('SELECT value FROM settings WHERE key = $1', [key]);
  return rows[0] ? { ...fallback, ...rows[0].value } : fallback;
}
export const getContent = unstable_cache(() => readSetting<SiteContent>('content', DEFAULT_CONTENT), ['content-v1'], { ...TTL, tags: ['content'] });
export const getSettings = unstable_cache(() => readSetting<SiteSettings>('site', DEFAULT_SETTINGS), ['settings-v1'], { ...TTL, tags: ['content'] });

export function toReview(r: Row): Review {
  return {
    id: r.id, productId: r.product_id, name: r.name, city: r.city, rating: r.rating, body: r.body, image: r.image,
    status: r.status, onHome: r.on_home, isDemo: r.is_demo, createdAt: new Date(r.created_at).toISOString(),
  };
}
export const getHomeReviews = unstable_cache(
  async () => (await db.query(`SELECT * FROM reviews WHERE status = 'approved' AND on_home = true ORDER BY created_at DESC LIMIT 12`)).map(toReview),
  ['home-reviews-v1'], { ...TTL, tags: ['reviews'] },
);
export const getProductReviews = unstable_cache(
  async (productId: string) => (await db.query(`SELECT * FROM reviews WHERE status = 'approved' AND product_id = $1 ORDER BY created_at DESC LIMIT 20`, [productId])).map(toReview),
  ['product-reviews-v1'], { ...TTL, tags: ['reviews'] },
);

// ---- Filtering ------------------------------------------------------------------------------
export interface ShopQuery {
  category?: string; collection?: string; gender?: string[]; size?: string[]; color?: string[];
  fit?: string[]; min?: number; max?: number; flags?: string[]; sort?: string; q?: string;
}
export const parseList = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? v.split(',') : []).filter(Boolean);

export function filterProducts(all: Product[], f: ShopQuery): Product[] {
  const q = f.q?.trim().toLowerCase();
  const out = all.filter((p) => {
    if (f.category && p.category !== f.category) return false;
    if (f.collection && p.collection !== f.collection) return false;
    if (f.gender?.length && !f.gender.includes(p.gender)) return false;
    if (f.fit?.length && !f.fit.includes(p.fit ?? '')) return false;
    if (f.color?.length && !p.colors.some((c) => f.color!.includes(c.id))) return false;
    if (f.size?.length && !f.size.some((s) => p.colors.some((c) => stockOf(p, c.id, s) > 0))) return false;
    const price = effectivePrice(p);
    if (f.min != null && price < f.min) return false;
    if (f.max != null && price > f.max) return false;
    if (f.flags?.includes('new') && !p.tags.includes('new')) return false;
    if (f.flags?.includes('best') && !p.tags.includes('best-seller')) return false;
    if (f.flags?.includes('sale') && !(p.salePrice != null && p.salePrice < p.price)) return false;
    if (f.flags?.includes('in-stock') && totalStock(p) === 0) return false;
    if (q && ![p.nameAr, p.nameEn, p.sku, p.category, p.descAr, p.descEn, ...p.colors.flatMap((c) => [c.nameAr, c.nameEn])].some((s) => s.toLowerCase().includes(q))) return false;
    return true;
  });
  const by: Record<string, (a: Product, b: Product) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    'price-asc': (a, b) => effectivePrice(a) - effectivePrice(b),
    'price-desc': (a, b) => effectivePrice(b) - effectivePrice(a),
    best: (a, b) => b.soldCount - a.soldCount,
  };
  return out.sort(by[f.sort ?? ''] ?? by.best);
}

export function facets(all: Product[]) {
  const colors = new Map<string, { id: string; nameAr: string; nameEn: string; hex: string }>();
  for (const p of all) for (const c of p.colors) colors.set(c.id, { id: c.id, nameAr: c.nameAr, nameEn: c.nameEn, hex: c.hex });
  const sizes = sortSizes(all.flatMap((p) => sizesOf(p)));
  const prices = all.map(effectivePrice);
  return { colors: [...colors.values()], sizes, minPrice: Math.min(...prices, 0), maxPrice: Math.max(...prices, 0) };
}

/** Drops fields a card doesn't need, so grids stay light on the wire. */
export const cardProps = (p: Product): Product => ({ ...p, descAr: '', descEn: '', fabricAr: '', fabricEn: '', careAr: '', careEn: '', fitAr: '', fitEn: '', colors: p.colors.map((c) => ({ ...c, images: c.images.slice(0, 2) })) });
