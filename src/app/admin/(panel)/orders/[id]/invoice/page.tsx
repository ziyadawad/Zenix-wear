import Image from 'next/image';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { toOrder } from '@/lib/orders';
import { getShippingRates } from '@/lib/catalog';
import { CONTACT } from '@/lib/utils';
import { egp, when } from '@/components/admin/ui';
import { PrintButton } from '@/components/admin/PrintButton';

export const dynamic = 'force-dynamic';

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!row) notFound();
  const o = toOrder(row);
  const gov = (await getShippingRates()).find((r) => r.id === o.governorate);
  return (
    <>
      <div className="no-print mb-4"><PrintButton /></div>
      <article className="mx-auto max-w-[760px] bg-white p-6 text-black md:p-10 print:p-0">
        <header className="flex items-start justify-between gap-4 border-b border-black pb-5">
          <div><Image src="/brand/wordmark.png" alt="ZENIX WEAR" width={592} height={56} className="h-auto w-[180px] invert" /><p className="mt-3 text-xs">{CONTACT.phone} · {CONTACT.email}</p></div>
          <div className="text-end text-sm"><p className="text-lg font-semibold">INVOICE</p><p>{o.number}</p><p className="text-xs">{when(o.createdAt)}</p></div>
        </header>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div><p className="text-xs font-semibold uppercase">Deliver to</p><p className="mt-1 leading-relaxed">{o.name}<br />{o.phone}{o.altPhone ? ` / ${o.altPhone}` : ''}<br />{o.address}<br />{o.city}, {gov?.nameEn ?? o.governorate}</p></div>
          <div><p className="text-xs font-semibold uppercase">Payment</p><p className="mt-1 uppercase">{o.paymentMethod}</p><p className="capitalize">{o.paymentStatus.replace('-', ' ')}</p></div>
        </div>
        <table className="mt-6 w-full text-sm">
          <thead><tr className="border-b border-black text-start"><th className="py-2 text-start">Item</th><th className="py-2 text-center">Qty</th><th className="py-2 text-end">Price</th><th className="py-2 text-end">Total</th></tr></thead>
          <tbody>
            {o.items.map((i, idx) => (
              <tr key={idx} className="border-b border-black/20"><td className="py-2">{i.nameEn}<br /><span className="text-xs">{i.colorEn} / {i.size} / {i.sku}</span></td><td className="py-2 text-center">{i.qty}</td><td className="py-2 text-end">{egp(i.price)}</td><td className="py-2 text-end">{egp(i.price * i.qty)}</td></tr>
            ))}
          </tbody>
        </table>
        <dl className="ms-auto mt-4 w-full max-w-[280px] space-y-1 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{egp(o.subtotal)}</dd></div>
          {o.discount > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>-{egp(o.discount)}</dd></div>}
          <div className="flex justify-between"><dt>Shipping</dt><dd>{o.shipping === 0 ? 'Free' : egp(o.shipping)}</dd></div>
          <div className="flex justify-between border-t border-black pt-2 text-base font-semibold"><dt>{o.paymentMethod === 'cod' ? 'Due on delivery' : 'Total'}</dt><dd>{egp(o.total)}</dd></div>
        </dl>
        {o.notes && <p className="mt-5 border-t border-black/20 pt-3 text-sm">Notes: {o.notes}</p>}
        <p className="mt-8 text-center text-xs">Exchange within 14 days · Thank you for choosing ZENIX WEAR</p>
      </article>
    </>
  );
}
