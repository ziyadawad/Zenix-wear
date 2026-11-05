import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_CONTENT } from '@/lib/db/seed';
import { getCollections, loadProducts } from '@/lib/catalog';
import type { SiteContent } from '@/lib/types';
import { PageHead } from '@/components/admin/ui';
import { ContentForm } from '@/components/admin/ContentForm';

export const dynamic = 'force-dynamic';

export default async function ContentPage() {
  await requireAdmin();
  const [row] = await db.query(`SELECT value FROM settings WHERE key = 'content'`);
  const [collections, products] = await Promise.all([getCollections(), loadProducts()]);
  return (
    <>
      <PageHead title="Homepage" sub="Everything here appears on the site as soon as you save." />
      <ContentForm
        initial={{ ...DEFAULT_CONTENT, ...(row?.value as Partial<SiteContent> | undefined) }}
        collections={collections.map((c) => ({ slug: c.slug, name: c.nameEn }))}
        products={products.map((p) => ({ id: p.id, name: p.nameEn }))}
      />
    </>
  );
}
