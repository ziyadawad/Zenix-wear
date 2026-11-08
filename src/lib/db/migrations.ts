import type { Queryable } from './index';
import { cleanImage, cleanImages } from './images';

/**
 * Ordered, run-once database changes. Each runs inside a transaction and is recorded in
 * schema_migrations, so existing data is kept and nothing runs twice. Append new entries; never edit old ones.
 */
interface Migration { id: string; up: (q: Queryable) => Promise<void> }

const MIGRATIONS: Migration[] = [
  {
    // Task: remove every photo of a person. Repoints stored image paths to product-only images.
    id: '2026-11-08-remove-people-photos',
    up: async (q) => {
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
