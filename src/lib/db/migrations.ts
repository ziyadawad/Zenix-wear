import type { Queryable } from './index';
import { cleanImage, cleanImages } from './images';

/**
 * Ordered, run-once database changes. Each runs inside a transaction and is recorded in
 * schema_migrations, so existing data is kept and nothing runs twice. Append new entries; never edit old ones.
 */
interface Migration { id: string; up: (q: Queryable) => Promise<void> }

/** Repoints every stored image path to a product-only image. Idempotent: running it again changes nothing. */
async function removePeoplePhotos(q: Queryable) {
  for (const p of await q.query<{ id: string; colors: { images: string[] }[] }>('SELECT id, colors FROM products')) {
    // A colour left with no image shows the logo rather than a broken box until a product shot is uploaded.
    const colors = p.colors.map((c) => { const images = cleanImages(c.images ?? []); return { ...c, images: images.length ? images : ['/brand/logo-icon-full.webp'] }; });
    if (JSON.stringify(colors) !== JSON.stringify(p.colors)) await q.query('UPDATE products SET colors = $1::jsonb WHERE id = $2', [JSON.stringify(colors), p.id]);
  }
  for (const o of await q.query<{ id: string; items: { image: string }[] }>('SELECT id, items FROM orders')) {
    const items = o.items.map((i) => ({ ...i, image: cleanImage(i.image) ?? '/brand/logo-icon-full.webp' }));
    if (JSON.stringify(items) !== JSON.stringify(o.items)) await q.query('UPDATE orders SET items = $1::jsonb WHERE id = $2', [JSON.stringify(items), o.id]);
  }
  for (const c of await q.query<{ slug: string; image: string }>('SELECT slug, image FROM collections')) {
    const image = cleanImage(c.image) ?? '/images/editorial/gym-bw.webp';
    if (image !== c.image) await q.query('UPDATE collections SET image = $1 WHERE slug = $2', [image, c.slug]);
  }
  for (const r of await q.query<{ id: string; image: string | null }>('SELECT id, image FROM reviews WHERE image IS NOT NULL')) {
    const image = cleanImage(r.image!);
    if (image !== r.image) await q.query('UPDATE reviews SET image = $1 WHERE id = $2', [image, r.id]);
  }
  const [row] = await q.query<{ value: Record<string, unknown> }>(`SELECT value FROM settings WHERE key = 'content'`);
  if (row) {
    const v = row.value as { hero?: { image: string; kind: string }[]; featuredCollectionImage?: string; community?: string[]; categoryImages?: Record<string, string> };
    const next = {
      ...v,
      // A slide whose photo was removed becomes a "brand" slide: approved hero photo (or dark background), logo and text.
      hero: (v.hero ?? []).map((s) => (s.image && cleanImage(s.image) === s.image ? s : { ...s, kind: 'brand', image: '' })),
      featuredCollectionImage: v.featuredCollectionImage ? cleanImage(v.featuredCollectionImage) ?? '/images/editorial/gym-bw.webp' : v.featuredCollectionImage,
      community: cleanImages(v.community ?? []),
      categoryImages: Object.fromEntries(Object.entries(v.categoryImages ?? {}).map(([k, src]) => [k, cleanImage(src) ?? '/images/editorial/gym-bw.webp'])),
    };
    // The old gallery mixed people in; fill it back to six with product shots.
    const fill = ['/images/products/tee-b-navy-p1.webp', '/images/products/cap-black-1.webp', '/images/products/tee-b-olive-p1.webp', '/images/products/shorts2-navy-1.webp', '/images/products/tee-a-wine-p2.webp', '/images/products/bag-black-1.webp'];
    for (const f of fill) if (next.community.length < 6 && !next.community.includes(f)) next.community.push(f);
    await q.query(`UPDATE settings SET value = $1::jsonb WHERE key = 'content'`, [JSON.stringify(next)]);
  }
}

const MIGRATIONS: Migration[] = [
  // Task: remove every photo of a person.
  { id: '2026-11-08-remove-people-photos', up: removePeoplePhotos },
  {
    // A first draft of the migration above ran on one database. This pass applies the final rules there too
    // (older leftover photos, colours left without an image) and turns the hero slides it had pointed at
    // stand-in photos into brand slides, so the approved hero photo is what shows.
    id: '2026-11-08-remove-people-photos-2',
    up: async (q) => {
      await removePeoplePhotos(q);
      const [row] = await q.query<{ value: { hero?: { image: string; kind: string }[] } }>(`SELECT value FROM settings WHERE key = 'content'`);
      const standIns = new Set(['/images/products/tee-lineup.webp', '/images/editorial/dumbbells.webp', '/images/editorial/rack.webp']);
      if (row?.value.hero?.some((h) => standIns.has(h.image))) {
        const hero = row.value.hero.map((h) => (standIns.has(h.image) ? { ...h, kind: 'brand', image: '' } : h));
        await q.query(`UPDATE settings SET value = jsonb_set(value, '{hero}', $1::jsonb) WHERE key = 'content'`, [JSON.stringify(hero)]);
      }
    },
  },
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
