import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getCategories, loadProducts } from '@/lib/catalog';
import { db } from '@/lib/db';
import { PageHead } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';
import { DeleteProductButton } from '@/components/admin/SmallActions';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [p] = await loadProducts('p.id = $1', [id]);
  if (!p) notFound();
  // Cost price is admin-only, so it is read here and never added to the store's catalogue.
  const [{ cost_price }] = await db.query<{ cost_price: number | null }>('SELECT cost_price FROM products WHERE id = $1', [id]);
  return (
    <>
      <PageHead title={p.nameEn} action={<DeleteProductButton id={p.id} />} />
      <ProductForm product={{ ...p, costPrice: cost_price }} categories={await getCategories()} />
    </>
  );
}
