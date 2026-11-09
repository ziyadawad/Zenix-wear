import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { getCategories } from '@/lib/catalog';
import { Card, PageHead } from '@/components/admin/ui';
import { CategoryForm } from '@/components/admin/CategoryForm';

export const dynamic = 'force-dynamic';

export default async function CategoriesPage() {
  await requireAdmin();
  const [categories, counts] = await Promise.all([getCategories(), db.query<{ category: string; n: number }>('SELECT category, count(*)::int AS n FROM products GROUP BY category')]);
  return (
    <>
      <PageHead title="Categories" sub="Each category gets its own page (/shop/…), a menu link and a homepage tile once it has a live product." />
      <div className="space-y-4">
        {categories.map((c) => <Card key={c.slug} title={`${c.nameEn} · ${c.nameAr}`}><CategoryForm category={c} count={counts.find((x) => x.category === c.slug)?.n ?? 0} /></Card>)}
        <Card title="Add a category"><CategoryForm category={null} /></Card>
      </div>
    </>
  );
}
