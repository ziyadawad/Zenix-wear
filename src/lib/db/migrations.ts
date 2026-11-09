import type { Queryable } from './index';
import { CATEGORY_MOCKUP, DEFAULT_COMMUNITY, SCENES, cleanImage, isOwnPhoto, mockupsFor, typeFromOldImage } from './images';
import LEGACY_AR from './legacy-ar.json';
import { insertStarterCatalogue } from './seed';

/**
 * Ordered, run-once database changes. Each runs inside a transaction and is recorded in
 * schema_migrations, so existing data is kept and nothing runs twice. Append new entries; never edit old ones.
 */
interface Migration { id: string; up: (q: Queryable) => Promise<void> }

/** Homepage defaults: every tile, banner and gallery image is a mockup. */
/** Used by the older migrations below. Category images now live on each category (Admin → Categories). */
const DEFAULT_CATEGORY_IMAGES: Record<string, string> = { 't-shirts': SCENES.tees, sleeveless: SCENES.sleeveless, collections: SCENES.all };
const COLLECTION_SCENES: Record<string, string> = {};

/**
 * No photos of people anywhere: every image shipped with the site becomes a product mockup in the product's
 * own colour (front and back). Photos the owner uploaded are kept and win over mockups. Idempotent.
 */
async function useMockups(q: Queryable) {
  const productMockups = new Map<string, string[]>();
  for (const p of await q.query<{ id: string; category: string; colors: { id: string; hex: string; images: string[] }[] }>('SELECT id, category, colors FROM products')) {
    const colors = p.colors.map((c) => {
      const own = (c.images ?? []).filter(isOwnPhoto);
      if (own.length) return { ...c, images: own };
      const type = (c.images ?? []).map(typeFromOldImage).find(Boolean) ?? CATEGORY_MOCKUP[p.category] ?? 'tee-a';
      return { ...c, images: mockupsFor(type, c.id, c.hex) };
    });
    colors.forEach((c) => productMockups.set(`${p.id}|${c.id}`, c.images));
    if (JSON.stringify(colors) !== JSON.stringify(p.colors)) await q.query('UPDATE products SET colors = $1::jsonb WHERE id = $2', [JSON.stringify(colors), p.id]);
  }
  for (const o of await q.query<{ id: string; items: { productId: string; colorId: string; image: string }[] }>('SELECT id, items FROM orders')) {
    const items = o.items.map((i) => (isOwnPhoto(i.image ?? '') || i.image?.startsWith('/images/mockups/') ? i : { ...i, image: productMockups.get(`${i.productId}|${i.colorId}`)?.[0] ?? cleanImage(i.image ?? '') }));
    if (JSON.stringify(items) !== JSON.stringify(o.items)) await q.query('UPDATE orders SET items = $1::jsonb WHERE id = $2', [JSON.stringify(items), o.id]);
  }
  for (const c of await q.query<{ slug: string; image: string }>('SELECT slug, image FROM collections')) {
    if (isOwnPhoto(c.image) || c.image.startsWith('/images/mockups/')) continue;
    await q.query('UPDATE collections SET image = $1 WHERE slug = $2', [COLLECTION_SCENES[c.slug] ?? SCENES.all, c.slug]);
  }
  for (const r of await q.query<{ id: string; image: string | null; product_id: string | null }>('SELECT id, image, product_id FROM reviews WHERE image IS NOT NULL')) {
    if (isOwnPhoto(r.image!) || r.image!.startsWith('/images/mockups/')) continue;
    await q.query('UPDATE reviews SET image = $1 WHERE id = $2', [cleanImage(r.image!), r.id]);
  }
  const [row] = await q.query<{ value: Record<string, unknown> }>(`SELECT value FROM settings WHERE key = 'content'`);
  if (row) {
    const v = row.value as { hero?: { image: string; kind: string }[]; featuredCollectionImage?: string; community?: string[]; categoryImages?: Record<string, string> };
    const keep = (src?: string) => !!src && (isOwnPhoto(src) || src.startsWith('/images/mockups/'));
    const next = {
      ...v,
      // Slides without the owner's own photo become brand slides: the hero mockup, the logo and the text.
      hero: (v.hero ?? []).map((s) => (s.image && isOwnPhoto(s.image) ? s : { ...s, kind: 'brand', image: '' })),
      featuredCollectionImage: keep(v.featuredCollectionImage) ? v.featuredCollectionImage : SCENES.all,
      community: (v.community ?? []).filter(keep),
      categoryImages: Object.fromEntries(Object.entries({ ...DEFAULT_CATEGORY_IMAGES, ...(v.categoryImages ?? {}) }).map(([k, src]) => [k, keep(src) ? src : DEFAULT_CATEGORY_IMAGES[k] ?? SCENES.all])),
    };
    for (const f of DEFAULT_COMMUNITY) if (next.community.length < 6 && !next.community.includes(f)) next.community.push(f);
    await q.query(`UPDATE settings SET value = $1::jsonb WHERE key = 'content'`, [JSON.stringify(next)]);
  }
}

const MIGRATIONS: Migration[] = [
  // Remove every photo of a person. (These two first ran an earlier rule set; on a new database they now
  // go straight to mockups, and the last migration below brings every database to the same state.)
  { id: '2026-11-08-remove-people-photos', up: useMockups },
  { id: '2026-11-08-remove-people-photos-2', up: useMockups },
  {
    // Task: private dashboard. Cost prices, order timestamps, and logs for stock, money and every dashboard change.
    id: '2026-11-08-dashboard',
    up: async (q) => {
      await q.query('ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price int CHECK (cost_price IS NULL OR cost_price >= 0)');
      for (const col of ['confirmed_at', 'shipped_at', 'delivered_at', 'closed_at']) await q.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col} timestamptz`);
      await q.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost int CHECK (shipping_cost IS NULL OR shipping_cost >= 0)');
      // Backfill the timestamps from each order's status history, so "late" and "this month" work for old orders too.
      const at = (statuses: string) => `(SELECT max((h->>'at')::timestamptz) FROM jsonb_array_elements(history) h WHERE h->>'status' IN (${statuses}))`;
      await q.query(`UPDATE orders SET
        confirmed_at = COALESCE(confirmed_at, ${at(`'confirmed'`)}),
        shipped_at = COALESCE(shipped_at, ${at(`'shipped'`)}),
        delivered_at = COALESCE(delivered_at, ${at(`'delivered'`)}),
        closed_at = COALESCE(closed_at, CASE WHEN status IN ('cancelled','returned') THEN ${at(`'cancelled','returned'`)} END)`);
      await q.query(`
        CREATE TABLE IF NOT EXISTS stock_movements (
          id text PRIMARY KEY, product_id text NOT NULL, color_id text NOT NULL, size text NOT NULL,
          delta int NOT NULL, stock_after int, kind text NOT NULL, reason text, ref text, actor text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await q.query('CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements(product_id, created_at DESC)');
      await q.query(`
        CREATE TABLE IF NOT EXISTS wallet_movements (
          id text PRIMARY KEY, wallet text NOT NULL, amount int NOT NULL, kind text NOT NULL, ref text, note text, actor text NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await q.query('CREATE INDEX IF NOT EXISTS wallet_movements_wallet_idx ON wallet_movements(wallet, created_at)');
      await q.query('CREATE INDEX IF NOT EXISTS wallet_movements_ref_idx ON wallet_movements(ref)');
      await q.query(`
        CREATE TABLE IF NOT EXISTS expenses (
          id text PRIMARY KEY, spent_on date NOT NULL, category text NOT NULL, amount int NOT NULL CHECK (amount > 0),
          wallet text NOT NULL, note text, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await q.query('CREATE INDEX IF NOT EXISTS expenses_date_idx ON expenses(spent_on DESC)');
      await q.query(`
        CREATE TABLE IF NOT EXISTS activity_log (
          id text PRIMARY KEY, actor text NOT NULL, action text NOT NULL, entity text NOT NULL, entity_id text NOT NULL,
          details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
        )`);
      await q.query('CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log(entity, entity_id, created_at DESC)');
      await q.query('CREATE INDEX IF NOT EXISTS orders_delivered_idx ON orders(delivered_at)');
      // Same protection as the other tables: blocks a hosted REST API, the app connects as the owner.
      for (const t of ['stock_movements', 'wallet_movements', 'expenses', 'activity_log', 'schema_migrations']) await q.query(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
    },
  },
  // No photos of people at all, including the approved ones: every shipped image is a product mockup.
  { id: '2026-11-09-mockups-only', up: useMockups },
  {
    // Databases seeded by the first version still hold women's, unisex and oversized products and the
    // first, more formal Arabic. Men only, no oversized, Egyptian colloquial.
    id: '2026-11-09-men-only-catalogue',
    up: async (q) => {
      const gone = await q.query<{ id: string }>(`SELECT id FROM products WHERE gender = 'women' OR fit = 'oversized' OR slug ILIKE '%oversize%' OR name_en ILIKE '%oversize%'`);
      for (const { id } of gone) {
        // A product someone already ordered stays in the database (order history), hidden from the store.
        const [used] = await q.query(`SELECT 1 FROM orders WHERE items @> $1::jsonb LIMIT 1`, [JSON.stringify([{ productId: id }])]);
        if (used) await q.query(`UPDATE products SET status = 'draft', fit = NULL, gender = 'men' WHERE id = $1`, [id]);
        else await q.query('DELETE FROM products WHERE id = $1', [id]);
      }
      await q.query(`UPDATE products SET gender = 'men' WHERE gender <> 'men'`);
      await q.query(`UPDATE products SET fit = NULL WHERE fit NOT IN ('regular','compression')`);
      // Replace a text only where it is still exactly the first version's wording, so the owner's own edits stay.
      const pairs = Object.entries(LEGACY_AR as Record<string, string>);
      for (const [from, to] of pairs) {
        for (const col of ['name_ar', 'desc_ar', 'fabric_ar', 'care_ar', 'fit_ar']) await q.query(`UPDATE products SET ${col} = $1 WHERE ${col} = $2`, [to, from]);
        for (const col of ['name_ar', 'story_ar']) await q.query(`UPDATE collections SET ${col} = $1 WHERE ${col} = $2`, [to, from]);
      }
      const [row] = await q.query<{ value: unknown }>(`SELECT value FROM settings WHERE key = 'content'`);
      if (row) {
        const map = new Map(pairs);
        const walk = (v: unknown): unknown => (typeof v === 'string' ? map.get(v) ?? v : Array.isArray(v) ? v.map(walk) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)])) : v);
        await q.query(`UPDATE settings SET value = $1::jsonb WHERE key = 'content'`, [JSON.stringify(walk(row.value))]);
      }
    },
  },
  {
    // The store sells two products for now: the short-sleeve tee and the sleeveless tee. Everything else
    // (other products and categories, collections, their demo reviews) is removed. Past orders keep their
    // own copy of each item's name, price and image, so order history stays complete.
    id: '2026-11-09-two-products',
    up: async (q) => {
      await q.query(`
        CREATE TABLE IF NOT EXISTS categories (
          slug text PRIMARY KEY, name_ar text NOT NULL, name_en text NOT NULL,
          blurb_ar text NOT NULL DEFAULT '', blurb_en text NOT NULL DEFAULT '',
          image text NOT NULL DEFAULT '', sort int NOT NULL DEFAULT 0, in_menu boolean NOT NULL DEFAULT true
        )`);
      await q.query('ALTER TABLE categories ENABLE ROW LEVEL SECURITY');
      await q.query(`DELETE FROM products WHERE id NOT IN ('regular-tee', 'sleeveless-tee')`); // variants, reviews, wishlist and alerts go with them
      await q.query(`DELETE FROM categories WHERE slug NOT IN ('t-shirts', 'sleeveless')`);
      await q.query('UPDATE products SET collection = NULL');
      await q.query('DELETE FROM collections');
      await q.query(`DELETE FROM reviews WHERE product_id IS NULL AND is_demo`);
      await insertStarterCatalogue(q);
      const [row] = await q.query<{ value: Record<string, unknown> }>(`SELECT value FROM settings WHERE key = 'content'`);
      if (row) {
        const { featuredCollection: _f, featuredCollectionImage: _fi, categoryImages: _c, ...v } = row.value as Record<string, unknown>;
        void _f; void _fi; void _c;
        const own = ((v.community as string[] | undefined) ?? []).filter(isOwnPhoto);
        const next = {
          ...v,
          shopImage: typeof v.shopImage === 'string' && isOwnPhoto(v.shopImage) ? v.shopImage : SCENES.all,
          bestSellerIds: ((v.bestSellerIds as string[] | undefined) ?? []).filter((id) => id === 'regular-tee' || id === 'sleeveless-tee'),
          community: [...own, ...DEFAULT_COMMUNITY].slice(0, 6),
        };
        await q.query(`UPDATE settings SET value = $1::jsonb WHERE key = 'content'`, [JSON.stringify(next)]);
      }
    },
  },
];

/** Applies pending migrations. Safe to call on every cold start: one small query when nothing is pending. */
export async function migrate(driver: { tx<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>; query: Queryable['query'] }) {
  // A brand-new database gets its base tables from `npm run db:setup` first, which then calls this again.
  const [{ ready }] = await driver.query<{ ready: boolean }>(`SELECT to_regclass('public.products') IS NOT NULL AS ready`);
  if (!ready) return;
  await driver.query('CREATE TABLE IF NOT EXISTS schema_migrations (id text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const done = new Set((await driver.query<{ id: string }>('SELECT id FROM schema_migrations')).map((r) => r.id));
  const pending = MIGRATIONS.filter((m) => !done.has(m.id));
  for (const m of pending) {
    await driver.tx(async (tx) => {
      // Serverless instances can start together; the lock makes the second one wait, then skip.
      await tx.query('SELECT pg_advisory_xact_lock(727274)');
      const [already] = await tx.query('SELECT 1 FROM schema_migrations WHERE id = $1', [m.id]);
      if (already) return;
      await m.up(tx);
      await tx.query('INSERT INTO schema_migrations (id) VALUES ($1)', [m.id]);
    });
    console.log(`[db] migration applied: ${m.id}`);
  }
}
