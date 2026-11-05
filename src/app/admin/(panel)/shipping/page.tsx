import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageHead } from '@/components/admin/ui';
import { ShippingForm } from '@/components/admin/ShippingForm';

export const dynamic = 'force-dynamic';

export default async function Shipping() {
  await requireAdmin();
  const rows = await db.query<{ id: string; name_en: string; name_ar: string; fee: number }>('SELECT id,name_en,name_ar,fee FROM shipping_rates ORDER BY sort');
  return (
    <>
      <PageHead title="Shipping fees" sub="Fee per governorate in EGP. The free-shipping threshold is under Settings." />
      <ShippingForm rates={rows} />
    </>
  );
}
