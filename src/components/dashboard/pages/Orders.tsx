'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { MessageCircle, Phone, Printer, Search } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { Big, Card, DataList, Offline, PAY, Row, StatusPill, Waiting, Warn, egp, num, pct, statusOf, toneText, when, type Tone } from '../ui';
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
  const openOrder = (o: { id: string; number: string }) => open(`أوردر ${o.number}`, <OrderPanel id={o.id} />);

  return (
    <div className="grid gap-3">
      <Card title="عدد الأوردرات في كل حالة" stale={counts.stale}>
        {counts.data ? (
          <ul className="grid grid-cols-2 gap-2 xs:grid-cols-4 lg:grid-cols-7">
            {C.orderStatuses.map((s) => (
              <li key={s.id} className="border border-line bg-ink p-3">
                <p className={`text-[13px] ${toneText[s.tone as Tone]}`}>{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{num(counts.data![s.id] ?? 0)}</p>
              </li>
            ))}
          </ul>
        ) : <Waiting failed={counts.stale} />}
      </Card>

      <div className="grid gap-3 lg:grid-cols-[2fr_1fr]">
        <Card title={`أوردرات متأخرة (اتأكد ومتشحنش بعد ${num(C.late.confirmedDays)} يوم، أو اتشحن ومتسلمش بعد ${num(C.late.shippedDays)} أيام)`} stale={late.stale} tone={late.data?.length ? 'bad' : 'neutral'}>
          {late.data ? (
            late.data.length ? (
              <DataList rows={late.data} rowKey={(o) => o.id} onRow={openOrder} rowTone={() => 'bad'}
                cols={[
                  { label: 'رقم', cell: (o) => o.number }, { label: 'الحالة', cell: (o) => <StatusPill status={o.status} /> },
                  { label: 'العميل', cell: (o) => `${o.name} · ${o.governorate ?? ''}`, main: true },
                  { label: 'متأخر', cell: (o) => <span className="text-[#ff8a8e]">⚠ {num(Math.floor(o.days))} يوم</span> }, { label: 'الإجمالي', cell: (o) => egp(o.total) },
                ]} />
            ) : <p className="text-sm text-[#6fd3a0]">✓ مفيش أوردرات متأخرة</p>
          ) : <Waiting failed={late.stale} />}
        </Card>
        <Card title="الإلغاء والمرتجع الشهر ده" stale={rates.stale}
          onOpen={rates.data ? () => open('الإلغاء والمرتجع الشهر ده', <dl><Row k="أوردرات الشهر" v={num(rates.data!.total)} /><Row k="اتلغى" v={`${num(rates.data!.cancelled)} (${pct(rates.data!.cancelRate)})`} tone="bad" /><Row k="مرتجع" v={`${num(rates.data!.returned)} (${pct(rates.data!.returnRate)})`} tone="bad" /></dl>) : undefined}>
          {rates.data ? (
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[12px] text-muted">نسبة الإلغاء</p><Big tone={rates.data.cancelRate > 0.15 ? 'bad' : 'neutral'}>{pct(rates.data.cancelRate)}</Big><p className="text-[12px] text-muted">{num(rates.data.cancelled)} من {num(rates.data.total)}</p></div>
              <div><p className="text-[12px] text-muted">نسبة المرتجع</p><Big tone={rates.data.returnRate > 0.1 ? 'bad' : 'neutral'}>{pct(rates.data.returnRate)}</Big><p className="text-[12px] text-muted">{num(rates.data.returned)} من {num(rates.data.total)}</p></div>
            </div>
          ) : <Waiting failed={rates.stale} />}
        </Card>
      </div>

      <Card title="آخر الأوردرات" stale={latest.stale}>
        <label className="relative mb-3 block">
          <span className="sr-only">دوّر برقم الأوردر أو الموبايل</span>
          <Search size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" placeholder="دوّر برقم الأوردر أو الموبايل" className="field !ps-9" />
        </label>
        {latest.data ? (
          <DataList rows={latest.data} rowKey={(o) => o.id} onRow={openOrder} empty={query ? 'مفيش أوردر بالرقم ده' : 'مفيش أوردرات لسه'}
            cols={[
              { label: 'رقم', cell: (o) => <span dir="ltr">{o.number}</span> }, { label: 'الوقت', cell: (o) => when(o.created_at) },
              { label: 'العميل', cell: (o) => o.name, main: true }, { label: 'المحافظة', cell: (o) => o.governorate },
              { label: 'الإجمالي', cell: (o) => egp(o.total) }, { label: 'الدفع', cell: (o) => PAY[o.payment_method] ?? o.payment_method },
              { label: 'الحالة', cell: (o) => <StatusPill status={o.status} /> },
            ]} />
        ) : <Waiting failed={latest.stale} />}
      </Card>
    </div>
  );
}

// ---- Order details panel -------------------------------------------------------------------------
type Detail = {
  id: string; number: string; name: string; phone: string; altPhone: string | null; email: string | null; governorate: string; city: string; address: string; notes: string | null;
  items: { nameAr: string; colorAr: string; size: string; qty: number; price: number; image: string; sku: string }[];
  subtotal: number; discount: number; shipping: number; total: number; promoCode: string | null; paymentMethod: string; paymentStatus: string; status: string;
  history: { status: string; at: string; note?: string; by?: string }[]; createdAt: string; shippingCost: number | null;
  log: { actor: string; action: string; created_at: string }[];
};

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
  if (!o) return failed ? <Offline /> : <p className="text-sm text-muted">الأوردر مش موجود.</p>;

  const change = async (status: string) => {
    const s = statusOf(status);
    if ((status === 'cancelled' || status === 'returned') && !confirm(`متأكد إنك عايز تخلي الأوردر "${s.label}"؟ القطع هترجع المخزون.`)) return;
    setBusy(true); setMsg(null);
    const r = await act('orderStatus', { id: o.id, status });
    setBusy(false);
    setMsg(r.ok ? { tone: 'good', text: `✓ الحالة بقت "${s.label}"` } : { tone: 'bad', text: r.error ?? 'معرفناش نغيّر الحالة' });
    if (r.ok) { reload(); window.dispatchEvent(new Event('dash:refresh')); }
  };
  const togglePaid = async () => {
    setBusy(true);
    const r = await act('orderPaid', { id: o.id, paid: o.paymentStatus !== 'paid' });
    setBusy(false);
    if (r.ok) { reload(); window.dispatchEvent(new Event('dash:refresh')); } else setMsg({ tone: 'bad', text: r.error ?? 'حصلت مشكلة' });
  };
  const first = o.name.split(' ')[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2"><StatusPill status={o.status} /><span className="text-[13px] text-muted">{when(o.createdAt)}</span></div>
      <div className="grid gap-2 sm:grid-cols-3">
        <a href={wa(o.phone, (MESSAGES[o.status] ?? MESSAGES.pending)(o.number, first))} target="_blank" rel="noopener noreferrer" className="btn btn-primary !min-h-12"><MessageCircle size={16} />كلّمه واتساب</a>
        <a href={`tel:${o.phone}`} className="btn btn-ghost !min-h-12"><Phone size={16} />اتصل</a>
        <a href={`/admin/orders/${o.id}/invoice`} target="_blank" className="btn btn-ghost !min-h-12"><Printer size={16} />اطبع الفاتورة</a>
      </div>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">غيّر الحالة</h3>
        <div className="grid grid-cols-2 gap-1.5 xs:grid-cols-4">
          {C.orderStatuses.map((s) => (
            <button key={s.id} type="button" disabled={busy || s.id === o.status} aria-pressed={s.id === o.status} onClick={() => change(s.id)}
              className={`min-h-11 border px-2 text-sm ${s.id === o.status ? 'border-white bg-white text-black' : 'border-line-strong hover:border-white disabled:opacity-50'}`}>{s.label}</button>
          ))}
        </div>
        {msg && <p className={`mt-2 text-sm ${toneText[msg.tone]}`} role="status">{msg.text}</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">المنتجات ({num(o.items.reduce((a, i) => a + i.qty, 0))} قطعة)</h3>
        <ul className="divide-y divide-line border border-line">
          {o.items.map((i, x) => (
            <li key={x} className="flex items-center gap-3 p-2.5 text-sm">
              <span className="relative h-14 w-11 flex-none bg-raised">{<Image src={displayImage(i.image)} alt="" fill sizes="44px" className="object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate">{i.nameAr}</span><span className="block text-[12px] text-muted">مقاس {i.size} · {i.colorAr} · {num(i.qty)} قطعة</span></span>
              <span className="flex-none tabular-nums">{egp(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2">
          <Row k="المنتجات" v={egp(o.subtotal)} />
          {o.discount > 0 && <Row k={`خصم ${o.promoCode ?? ''}`} v={`− ${egp(o.discount)}`} />}
          <Row k="الشحن (على العميل)" v={o.shipping ? egp(o.shipping) : 'مجاني'} />
          <Row k="الإجمالي" v={<strong>{egp(o.total)}</strong>} />
          {o.shippingCost != null && <Row k="تكلفة الشحن علينا" v={egp(o.shippingCost)} />}
        </dl>
      </section>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">العميل والعنوان</h3>
        <dl>
          <Row k="الاسم" v={o.name} /><Row k="الموبايل" v={<span dir="ltr">{o.phone}{o.altPhone ? ` / ${o.altPhone}` : ''}</span>} />
          <Row k="المحافظة" v={`${o.governorate} · ${o.city}`} /><Row k="العنوان" v={o.address} />
        </dl>
        {o.notes && <p className="mt-2 border-s-2 border-line-strong ps-3 text-sm text-silver">ملاحظات: {o.notes}</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">الدفع</h3>
        <dl><Row k="الطريقة" v={PAY[o.paymentMethod] ?? o.paymentMethod} /><Row k="الحالة" v={o.paymentStatus === 'paid' ? 'اتدفع ✓' : o.paymentStatus === 'proof-submitted' ? 'بعت صورة التحويل، راجعها' : 'لسه مدفعش'} tone={o.paymentStatus === 'paid' ? 'good' : 'neutral'} /></dl>
        {o.paymentMethod !== 'cod' && <button type="button" disabled={busy} onClick={togglePaid} className="btn btn-ghost mt-2 !min-h-11 w-full">{o.paymentStatus === 'paid' ? 'علّمه مش مدفوع' : 'علّمه مدفوع (الفلوس هتنزل في المحفظة)'}</button>}
        {o.paymentMethod === 'cod' && <p className="mt-1 text-[12px] text-muted">كاش عند الاستلام: لما يتسلم، الفلوس بتتسجل عند شركة الشحن لحد ما تحوّلها.</p>}
      </section>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">تاريخ الحالة (مين غيّرها وإمتى)</h3>
        <ol className="space-y-2">
          {[...o.history].reverse().map((h, x) => (
            <li key={x} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 pb-2 text-sm last:border-0">
              <span className="flex items-center gap-2"><StatusPill status={h.status} />{h.note && <span className="text-[12px] text-muted">{h.note}</span>}</span>
              <span className="text-[12px] text-muted">{when(h.at)} · {h.by ?? (x === o.history.length - 1 ? 'العميل (من الموقع)' : 'الإدارة')}</span>
            </li>
          ))}
        </ol>
        {o.log.length > 0 && (
          <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">سجل التعديلات ({num(o.log.length)})</summary>
            <ul className="mt-2 space-y-1">{o.log.map((l, x) => <li key={x} className="text-[12px] text-muted">{when(l.created_at)} · {l.actor}: {l.action}</li>)}</ul>
          </details>
        )}
      </section>
      {o.status === 'pending' && <Warn>الأوردر لسه جديد: كلّم العميل وأكّده.</Warn>}
    </div>
  );
}
