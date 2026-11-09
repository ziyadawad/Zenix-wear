import { requireAdmin } from '@/lib/auth';
import { getCategories } from '@/lib/catalog';
import { PageHead } from '@/components/admin/ui';
import { ProductForm } from '@/components/admin/ProductForm';

export default async function NewProduct() {
  await requireAdmin();
  return (
    <>
      <PageHead title="Add product" />
      <ProductForm product={null} categories={await getCategories()} />
    </>
  );
}
