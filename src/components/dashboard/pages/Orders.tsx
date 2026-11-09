'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertTriangle, CheckCircle2, ListChecks, ListOrdered, MessageCircle, Phone, Printer, Search, Undo2 } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { L, dashLang } from '../i18n';
import { Big, Card, DataList, Empty, Note, Offline, Row, StatusPill, Waiting, Warn, egp, num, pct, payName, pieces, statusOf, toneText, when, type Tone } from '../ui';
import { displayImage } from '@/lib/db/images';

type OrderRow = { id: string; number: string; name: string; phone: string; governorate: string; total: number; payment_method: string; payment_status: string; status: string; created_at: string };
type Late = { id: string; number: string; name: string; phone: string; status: string; total: number; governorate: string; since: string; days: number };
type Rates = { total: number; cancelled: number; returned: number; cancelRate: number; returnRate: number };

export function OrdersPage() {
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  useEffect(() => { const id = setTimeout(() => setQuery(q), 350); return () => clearTimeout(id); }, [q]);
  const { sec } = usePage('orders', { q: query });
  const { open } = useShell();
  const counts = sec<Record<string, number>>('counts'), late = sec<Late[]>('late'), latest = sec<OrderRow[]>('latest'), rates = sec<Rates>('rates');
  const openOrder = (o: { id: string; number: string }) => open(L(`أوردر ${o.number}`, `Order ${o.number}`), <OrderPanel id={o.id} />);
  const days = (n: number) => L(`${num(n)} يوم`, `${num(n)} ${n === 1 ? 'day' : 'days'}`);

  return (
    <div className="grid gap-3 md:gap-4">
      <Card title={L('الأوردرات حسب الحالة', 'Orders by status')} icon={ListChecks} stale={counts.stale}>
        {counts.data ? (
          <ul className="grid grid-cols-2 gap-2 xs:grid-cols-4 lg:grid-cols-7">
            {C.orderStatuses.map((s) => (
              <li key={s.id} className="rounded-md border border-line bg-ink p-3">
                <p className={`text-[13px] ${toneText[s.tone as Tone]}`}>{L(s.label, s.labelEn)}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{num(counts.data![s.id] ?? 0)}</p>
              </li>
            ))}
          </ul>
        ) : <Waiting failed={counts.stale} />}
      </Card>

      <div className="grid gap-3 md:gap-4 lg:grid-cols-[2fr_1fr]">
        <Card title={L('أوردرات متأخرة', 'Late orders')} icon={AlertTriangle} stale={late.stale} tone={late.data?.length ? 'bad' : 'neutral'}>
          {late.data ? (
            late.data.length ? (
              <DataList rows={late.data} rowKey={(o) => o.id} onRow={openOrder} rowTone={() => 'bad'}
                cols={[
                  { label: L('رقم', 'No.'), cell: (o) => o.number }, { label: L('الحالة', 'Status'), cell: (o) => <StatusPill status={o.status} /> },
                  { label: L('العميل', 'Customer'), cell: (o) => `${o.name} · ${o.governorate ?? ''}`, main: true },
                  { label: L('متأخر', 'Late by'), cell: (o) => <span className="text-[#ff8a8e]">⚠ {days(Math.floor(o.days))}</span> }, { label: L('الإجمالي', 'Total'), cell: (o) => egp(o.total) },
                ]} />
            ) : <Empty text={L('مفيش أوردرات متأخرة', 'No late orders')} icon={CheckCircle2} tone="good" />
          ) : <Waiting failed={late.stale} />}
          <Note>{L(`متأخر = اتأكد ومتشحنش بعد ${num(C.late.confirmedDays)} يوم، أو اتشحن ومتسلمش بعد ${num(C.late.shippedDays)} أيام.`, `Late = confirmed but not shipped after ${num(C.late.confirmedDays)} days, or shipped but not delivered after ${num(C.late.shippedDays)} days.`)}</Note>
        </Card>
        <Card title={L('الإلغاء والمرتجع الشهر ده', 'Cancelled & returned this month')} icon={Undo2} stale={rates.stale}
          onOpen={rates.data ? () => open(L('الإلغاء والمرتجع الشهر ده', 'Cancelled & returned this month'), <dl><Row k={L('أوردرات الشهر', 'Orders this month')} v={num(rates.data!.total)} /><Row k={L('اتلغى', 'Cancelled')} v={`${num(rates.data!.cancelled)} (${pct(rates.data!.cancelRate)})`} tone="bad" /><Row k={L('مرتجع', 'Returned')} v={`${num(rates.data!.returned)} (${pct(rates.data!.returnRate)})`} tone="bad" /></dl>) : undefined}>
          {rates.data ? (
            <div className="grid grid-cols-2 gap-3">
              <div><p className="mb-1.5 text-[12px] text-muted">{L('نسبة الإلغاء', 'Cancel rate')}</p><Big tone={rates.data.cancelRate > 0.15 ? 'bad' : 'neutral'}>{pct(rates.data.cancelRate)}</Big><Note>{L(`${num(rates.data.cancelled)} من ${num(rates.data.total)}`, `${num(rates.data.cancelled)} of ${num(rates.data.total)}`)}</Note></div>
              <div><p className="mb-1.5 text-[12px] text-muted">{L('نسبة المرتجع', 'Return rate')}</p><Big tone={rates.data.returnRate > 0.1 ? 'bad' : 'neutral'}>{pct(rates.data.returnRate)}</Big><Note>{L(`${num(rates.data.returned)} من ${num(rates.data.total)}`, `${num(rates.data.returned)} of ${num(rates.data.total)}`)}</Note></div>
            </div>
          ) : <Waiting failed={rates.stale} />}
        </Card>
      </div>

      <Card title={L('آخر الأوردرات', 'Latest orders')} icon={ListOrdered} stale={latest.stale}>
        <label className="relative mb-4 block">
          <span className="sr-only">{L('دوّر برقم الأوردر أو الموبايل', 'Search by order number or phone')}</span>
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" placeholder={L('دوّر برقم الأوردر أو الموبايل', 'Search by order number or phone')} className="field !ps-9" />
        </label>
        {latest.data ? (
          <DataList rows={latest.data} rowKey={(o) => o.id} onRow={openOrder} empty={query ? L('مفيش أوردر بالرقم ده', 'No order matches') : L('لسه مفيش أوردرات', 'No orders yet')}
            cols={[
              { label: L('رقم', 'No.'), cell: (o) => <span dir="ltr">{o.number}</span> }, { label: L('الوقت', 'Time'), cell: (o) => when(o.created_at) },
              { label: L('العميل', 'Customer'), cell: (o) => o.name, main: true }, { label: L('المحافظة', 'Governorate'), cell: (o) => o.governorate },
              { label: L('الإجمالي', 'Total'), cell: (o) => egp(o.total) }, { label: L('الدفع', 'Payment'), cell: (o) => payName(o.payment_method) },
              { label: L('الحالة', 'Status'), cell: (o) => <StatusPill status={o.status} /> },
            ]} />
        ) : <Waiting failed={latest.stale} />}
      </Card>
    </div>
  );
}

// ---- Order details panel -------------------------------------------------------------------------
type Detail = {
  id: string; number: string; name: string; phone: string; altPhone: string | null; email: string | null; governorate: string; city: string; address: string; notes: string | null;
  items: { nameAr: string; nameEn?: string; colorAr: string; colorEn?: string; size: string; qty: number; price: number; image: string; sku: string }[];
  subtotal: number; discount: number; shipping: number; total: number; promoCode: string | null; paymentMethod: string; paymentStatus: string; status: string;
  history: { status: string; at: string; note?: string; by?: string }[]; createdAt: string; shippingCost: number | null;
  log: { actor: string; action: string; created_at: string }[];
};

// WhatsApp messages go to the customer, so they stay in Arabic whatever the dashboard language.
const MESSAGES: Record<string, (n: string, name: string) => string> = {
  pending: (n, name) => `أهلًا ${name}، معاك ZENIX WEAR. الأوردر رقم ${n} وصلنا. ممكن تأكدلنا البيانات والعنوان؟`,
  confirmed: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR اتأكد، وهيتشحن قريب.`,
  preparing: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR بيتجهز دلوقتي وهيتشحن قريب جدًا.`,
  shipped: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} من ZENIX WEAR اتشحن وفي الطريق ليك. المندوب هيكلمك قبل ما يوصل.`,
  delivered: (n, name) => `أهلًا ${name}، الأوردر رقم ${n} وصلك؟ يارب يكون عجبك. شكرًا إنك اخترت ZENIX WEAR.`,
  returned: (n, name) => `أهلًا ${name}، بخصوص الأوردر رقم ${n} من ZENIX WEAR: المرتجع وصلنا.`,
  cancelled: (n, name) => `أهلًا ${name}، بخصوص الأوردر رقم ${n} من ZENIX WEAR: الأوردر اتلغى.`,
};
const wa = (phone: string, text: string) => `https://wa.me/2${phone.replace(/^\+?2/, '')}?text=${encodeURIComponent(text)}`;

export function OrderPanel({ id }: { id: string }) {
  const { data: o, failed, loading, reload } = useDetail<Detail | null>('order', { id });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: Tone; text: string } | null>(null);
  if (loading && !o) return <Waiting />;
  if (!o) return failed ? <Offline /> : <Empty text={L('الأوردر مش موجود', 'Order not found')} />;
  const en = dashLang() === 'en';

  const change = async (status: string) => {
    const s = statusOf(status);
    if ((status === 'cancelled' || status === 'returned') && !confirm(L(`متأكد إنك عايز تخلي الأوردر "${s.label}"؟ القطع هترجع المخزون.`, `Mark this order "${s.label}"? Its pieces go back to stock.`))) return;
    setBusy(true); setMsg(null);
    const r = await act('orderStatus', { id: o.id, status });
    setBusy(false);
    setMsg(r.ok ? { tone: 'good', text: L(`✓ الحالة بقت "${s.label}"`, `✓ Status is now "${s.label}"`) } : { tone: 'bad', text: r.error ?? L('معرفناش نغيّر الحالة', 'Could not change the status') });
    if (r.ok) { reload(); window.dispatchEvent(new Event('dash:refresh')); }
  };
  const togglePaid = async () => {
    setBusy(true);
    const r = await act('orderPaid', { id: o.id, paid: o.paymentStatus !== 'paid' });
    setBusy(false);
    if (r.ok) { reload(); window.dispatchEvent(new Event('dash:refresh')); } else setMsg({ tone: 'bad', text: r.error ?? L('حصلت مشكلة', 'Something went wrong') });
  };
  const first = o.name.split(' ')[0];
  const paidText = o.paymentStatus === 'paid' ? L('اتدفع ✓', 'Paid ✓') : o.paymentStatus === 'proof-submitted' ? L('بعت صورة التحويل، راجعها', 'Transfer screenshot sent, check it') : L('لسه مدفعش', 'Not paid yet');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={o.status} /><span className="text-[13px] text-muted">{when(o.createdAt)}</span></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={wa(o.phone, (MESSAGES[o.status] ?? MESSAGES.pending)(o.number, first))} target="_blank" rel="noopener noreferrer" className="btn btn-primary !min-h-12"><MessageCircle size={16} />{L('واتساب', 'WhatsApp')}</a>
        <a href={`tel:${o.phone}`} className="btn btn-ghost !min-h-12"><Phone size={16} />{L('اتصل', 'Call')}</a>
        <a href={`/admin/orders/${o.id}/invoice`} target="_blank" className="btn btn-ghost !min-h-12"><Printer size={16} />{L('الفاتورة', 'Invoice')}</a>
      </div>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('غيّر الحالة', 'Change status')}</h3>
        <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-4">
          {C.orderStatuses.map((s) => (
            <button key={s.id} type="button" disabled={busy || s.id === o.status} aria-pressed={s.id === o.status} onClick={() => change(s.id)}
              className={`min-h-11 rounded-md border px-2 text-sm transition-colors ${s.id === o.status ? 'dash-chip-on' : 'border-line-strong hover:border-white disabled:opacity-50'}`}>{L(s.label, s.labelEn)}</button>
          ))}
        </div>
        {msg && <p className={`mt-2 text-sm ${toneText[msg.tone]}`} role="status">{msg.text}</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('المنتجات', 'Items')} ({pieces(o.items.reduce((a, i) => a + i.qty, 0))})</h3>
        <ul className="divide-y divide-line rounded-md border border-line">
          {o.items.map((i, x) => (
            <li key={x} className="flex items-center gap-3 p-2.5 text-sm">
              <span className="relative h-14 w-11 flex-none overflow-hidden rounded-sm bg-raised"><Image src={displayImage(i.image)} alt="" fill sizes="44px" className="object-cover" /></span>
              <span className="min-w-0 flex-1"><span className="block truncate">{en ? i.nameEn ?? i.nameAr : i.nameAr}</span><span className="block text-[12px] text-muted">{L('مقاس', 'Size')} {i.size} · {en ? i.colorEn ?? i.colorAr : i.colorAr} · {pieces(i.qty)}</span></span>
              <span className="flex-none tabular-nums">{egp(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2">
          <Row k={L('المنتجات', 'Items')} v={egp(o.subtotal)} />
          {o.discount > 0 && <Row k={`${L('خصم', 'Discount')} ${o.promoCode ?? ''}`} v={`− ${egp(o.discount)}`} />}
          <Row k={L('الشحن (على العميل)', 'Shipping (paid by customer)')} v={o.shipping ? egp(o.shipping) : L('مجاني', 'Free')} />
          <Row k={L('الإجمالي', 'Total')} v={<strong>{egp(o.total)}</strong>} />
          {o.shippingCost != null && <Row k={L('تكلفة الشحن علينا', 'Our shipping cost')} v={egp(o.shippingCost)} />}
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('العميل والعنوان', 'Customer & address')}</h3>
        <dl>
          <Row k={L('الاسم', 'Name')} v={o.name} /><Row k={L('الموبايل', 'Phone')} v={<span dir="ltr">{o.phone}{o.altPhone ? ` / ${o.altPhone}` : ''}</span>} />
          <Row k={L('المحافظة', 'Governorate')} v={`${o.governorate} · ${o.city}`} /><Row k={L('العنوان', 'Address')} v={o.address} />
        </dl>
        {o.notes && <p className="mt-2 border-s-2 border-line-strong ps-3 text-sm text-silver">{L('ملاحظات', 'Notes')}: {o.notes}</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('الدفع', 'Payment')}</h3>
        <dl><Row k={L('الطريقة', 'Method')} v={payName(o.paymentMethod)} /><Row k={L('الحالة', 'Status')} v={paidText} tone={o.paymentStatus === 'paid' ? 'good' : 'neutral'} /></dl>
        {o.paymentMethod !== 'cod' && <button type="button" disabled={busy} onClick={togglePaid} className="btn btn-ghost mt-2 !min-h-11 w-full">{o.paymentStatus === 'paid' ? L('علّمه مش مدفوع', 'Mark as not paid') : L('علّمه مدفوع (الفلوس هتنزل في المحفظة)', 'Mark as paid (money goes to the wallet)')}</button>}
        {o.paymentMethod === 'cod' && <Note>{L('كاش عند الاستلام: لما يتسلم، الفلوس بتتسجل عند شركة الشحن لحد ما تحوّلها.', 'Cash on delivery: once delivered, the money is held by the courier until they pay it out.')}</Note>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('تاريخ الحالة', 'Status history')}</h3>
        <ol className="space-y-2">
          {[...o.history].reverse().map((h, x) => (
            <li key={x} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm last:border-0">
              <span className="flex items-center gap-2"><StatusPill status={h.status} />{h.note && <span className="text-[12px] text-muted">{h.note}</span>}</span>
              <span className="text-[12px] text-muted">{when(h.at)} · {h.by ?? (x === o.history.length - 1 ? L('العميل (من الموقع)', 'Customer (website)') : L('الإدارة', 'Admin'))}</span>
            </li>
          ))}
        </ol>
        {o.log.length > 0 && (
          <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">{L('سجل التعديلات', 'Change log')} ({num(o.log.length)})</summary>
            <ul className="mt-2 space-y-1">{o.log.map((l, x) => <li key={x} className="text-[12px] text-muted">{when(l.created_at)} · {l.actor}: {l.action}</li>)}</ul>
          </details>
        )}
      </section>
      {o.status === 'pending' && <Warn>{L('الأوردر لسه جديد: كلّم العميل وأكّده.', 'New order: call the customer and confirm it.')}</Warn>}
    </div>
  );
}
