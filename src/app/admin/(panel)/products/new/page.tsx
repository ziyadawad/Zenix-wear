import { requireAdmin } from '@/lib/auth';
import { getCollections } from '@/lib/catalog';
import { PageHead } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProduct() {
  await requireAdmin();
  return (
    <>
      <PageHead title="Add product" />
      <ProductForm product={null} collections={await getCollections()} />
    </>
  );
}
