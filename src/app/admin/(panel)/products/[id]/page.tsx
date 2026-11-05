import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { getCollections, loadProducts } from '@/lib/catalog';
import { PageHead } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';
import { DeleteProductButton } from '@/components/admin/SmallActions';

export default async function EditProduct({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [p] = await loadProducts('p.id = $1', [id]);
  if (!p) notFound();
  return (
    <>
      <PageHead title={p.nameEn} action={<DeleteProductButton id={p.id} />} />
      <ProductForm product={p} collections={await getCollections()} />
    </>
  );
}
