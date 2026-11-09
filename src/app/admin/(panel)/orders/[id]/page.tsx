import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageCircle, Phone, Printer } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { toOrder } from '@/lib/orders';
import { getShippingRates } from '@/lib/catalog';
import { customerWhatsapp } from '@/lib/utils';
import { Card, PageHead, StatusBadge, egp, when } from '@/components/admin/ui';
import { OrderStatusControl, PaymentToggle } from '@/components/admin/SmallActions';
import { displayImage } from '@/lib/db/images';

export const dynamic = 'force-dynamic';

const MESSAGES: Record<string, (n: string, name: string) => string> = {
  pending: (n, name) => `أهلًا ${name}، معاك ZENIX WEAR. الأوردر رقم ${n} وصلنا. ممكن تأكدلنا البيانات والعنوان؟`,
  confirmed: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR اتأكد، وهيتشحن قريب.`,
  preparing: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR بيتجهز دلوقتي وهيتشحن قريب جدًا.`,
  shipped: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR اتشحن وفي الطريق ليك. المندوب هيكلمك قبل ما يوصل.`,
  delivered: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} وصلك؟ يارب يكون عجبك. شكرًا إنك اخترت ZENIX WEAR.`,
  returned: (n, name) => `أهلًا ${name}، بخصوص الأوردر رقم ${n} من ZENIX WEAR: المرتجع وصلنا.`,
  cancelled: (n, name) => `أهلًا ${name}، بخصوص الأوردر رقم ${n} من ZENIX WEAR: الأوردر اتلغى.`,
};

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [row] = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
  if (!row) notFound();
  const o = toOrder(row);
  const rates = await getShippingRates();
  const gov = rates.find((r) => r.id === o.governorate);
  const wa = customerWhatsapp(o.phone, (MESSAGES[o.status] ?? MESSAGES.pending)(o.number, o.name.split(' ')[0]));
  return (
    <>
      <PageHead title={o.number} sub={when(o.createdAt)} action={<Link href="/admin/orders" className="text-sm text-muted underline underline-offset-4">All orders</Link>} />
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={wa} target="_blank" rel="noopener noreferrer" className="btn btn-primary"><MessageCircle size={16} strokeWidth={1.5} />WhatsApp customer</a>
        <a href={`tel:${o.phone}`} className="btn btn-ghost"><Phone size={16} strokeWidth={1.25} />Call {o.phone}</a>
        <Link href={`/admin/orders/${o.id}/invoice`} className="btn btn-ghost"><Printer size={16} strokeWidth={1.25} />Print invoice</Link>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-4">
          <Card title="Status"><OrderStatusControl id={o.id} status={o.status} /></Card>
          <Card title={`Items (${o.items.reduce((a, i) => a + i.qty, 0)})`}>
            <ul className="divide-y divide-line">
              {o.items.map((i, idx) => (
                <li key={idx} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="relative h-16 w-[52px] flex-none bg-raised"><Image src={displayImage(i.image)} alt="" fill sizes="52px" quality={70} className="object-cover" /></span>
                  <span className="min-w-0 flex-1">{i.nameEn}<span className="block text-xs text-muted">{i.colorEn} / {i.size} / {i.sku}</span></span>
                  <span className="flex-none text-end">{egp(i.price * i.qty)}<span className="block text-xs text-muted">{i.qty} × {egp(i.price)}</span></span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-line pt-3 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Subtotal</dt><dd>{egp(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between"><dt className="text-muted">Discount ({o.promoCode})</dt><dd>-{egp(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Shipping</dt><dd>{o.shipping === 0 ? 'Free' : egp(o.shipping)}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base"><dt>Total</dt><dd>{egp(o.total)}</dd></div>
            </dl>
          </Card>
          <Card title="History">
            <ol className="space-y-2 text-sm">
              {o.history.map((h, i) => <li key={i} className="flex items-center justify-between gap-3"><StatusBadge status={h.status} /><span className="text-xs text-muted">{when(h.at)}{h.by ? ` · ${h.by}` : ''}</span></li>)}
            </ol>
          </Card>
        </div>
        <div className="min-w-0 space-y-4">
          <Card title="Customer">
            <p className="text-sm leading-[1.9]">{o.name}<br /><span dir="ltr">{o.phone}</span>{o.altPhone ? <> / <span dir="ltr">{o.altPhone}</span></> : null}{o.email ? <><br /><span className="break-all">{o.email}</span></> : null}</p>
            <p className="mt-3 text-sm leading-[1.9] text-muted">{o.address}<br />{o.city}, {gov?.nameEn ?? o.governorate}</p>
            {o.notes && <p className="mt-3 border-s-2 border-line-strong ps-3 text-sm italic text-silver">{o.notes}</p>}
          </Card>
          <Card title="Payment">
            <p className="text-sm uppercase">{o.paymentMethod}</p>
            <p className="mt-1 text-sm capitalize text-muted">{o.paymentStatus.replace('-', ' ')}{o.paymentRef ? ` · ref ${o.paymentRef}` : ''}</p>
            {o.paymentProof && (
              <a href={`/api/admin/proof?ref=${encodeURIComponent(o.paymentProof)}`} target="_blank" rel="noopener noreferrer" className="mt-3 block w-fit border border-line">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/admin/proof?ref=${encodeURIComponent(o.paymentProof)}`} alt="Transfer screenshot" className="max-h-[320px] w-auto" />
              </a>
            )}
            <div className="mt-3"><PaymentToggle id={o.id} paid={o.paymentStatus === 'paid'} /></div>
          </Card>
        </div>
      </div>
    </>
  );
}
