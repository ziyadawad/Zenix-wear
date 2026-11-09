'use client';
import { useState } from 'react';
import Image from 'next/image';
import { Boxes, CheckCircle2, CircleDollarSign, Package, Tag } from 'lucide-react';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { L } from '../i18n';
import { Big, Card, DataList, Empty, Note, Offline, Waiting, Warn, egp, num, pieces, sizeLabel, toneText, when } from '../ui';

type Product = { id: string; slug: string; name: string; image: string | null; live: boolean; price: number; cost: number | null; min: number; sizes: string[]; colors: { id: string; name: string; hex: string; cells: (number | null)[] }[]; total: number; low: number; out: number };
type Totals = { pieces: number; atCost: number; atPrice: number; piecesWithoutCost: number };
const kindName = (k: string) => ({
  sale: L('اتباع', 'Sold'), cancel: L('رجع (إلغاء)', 'Back (cancelled)'), return: L('رجع (مرتجع)', 'Back (returned)'),
  reopen: L('اتسحب تاني (رجوع أوردر)', 'Taken again (order reopened)'), manual: L('تعديل يدوي', 'Manual change'), edit: L('تعديل من صفحة المنتج', 'Edited on product page'),
} as Record<string, string>)[k] ?? k;

export function StockPage() {
  const { sec } = usePage('stock');
  const { open } = useShell();
  const products = sec<Product[]>('products'), totals = sec<Totals>('totals');
  const [onlyLow, setOnlyLow] = useState(false);
  const list = (products.data ?? []).filter((p) => !onlyLow || p.low > 0);
  const lowCount = (products.data ?? []).reduce((a, p) => a + p.low, 0);

  return (
    <div className="grid gap-3 md:gap-4">
      <div className="grid gap-3 sm:grid-cols-3 md:gap-4">
        <Card title={L('القطع في المخزن', 'Pieces in stock')} icon={Boxes} stale={totals.stale}>{totals.data ? <Big>{num(totals.data.pieces)}</Big> : <Waiting failed={totals.stale} />}</Card>
        <Card title={L('قيمة المخزون بالتكلفة', 'Stock value at cost')} icon={CircleDollarSign} stale={totals.stale}>
          {totals.data ? <><Big>{egp(totals.data.atCost)}</Big>{totals.data.piecesWithoutCost > 0 && <Note className="!text-[#e9bd67]">⚠ {L(`${pieces(totals.data.piecesWithoutCost)} من غير سعر تكلفة`, `${pieces(totals.data.piecesWithoutCost)} without a cost price`)}</Note>}</> : <Waiting failed={totals.stale} />}
        </Card>
        <Card title={L('قيمة المخزون بسعر البيع', 'Stock value at price')} icon={Tag} stale={totals.stale}>{totals.data ? <Big>{egp(totals.data.atPrice)}</Big> : <Waiting failed={totals.stale} />}</Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${lowCount ? toneText.bad : toneText.good}`}>{products.data ? (lowCount ? L(`⚠ ${num(lowCount)} مقاس/لون محتاج نزوّد`, `⚠ ${num(lowCount)} size/colour combos need restocking`) : L('✓ كل المقاسات فوق الحد الأدنى', '✓ Every size is above the minimum')) : ''} {products.stale && <Offline />}</p>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="dash-check size-4" />{L('اعرض اللي محتاج نزوّد بس', 'Show only what needs restocking')}</label>
      </div>

      {!products.data ? <Card title={L('المنتجات', 'Products')} icon={Package} stale={products.stale}><Waiting failed={products.stale} /></Card> : (
        <div className="grid gap-3 md:gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} title={p.name} icon={Package} tone={p.low ? 'bad' : 'neutral'} onOpen={() => open(p.name, <StockPanel product={p} />)}
              action={<span className={`rounded-sm border px-1.5 py-0.5 text-[11px] ${p.live ? 'border-line-strong text-silver' : 'border-line text-muted'}`}>{p.live ? L('معروض', 'Live') : L('مخفي', 'Hidden')}</span>}>
              <div className="mb-3 flex items-center gap-3">
                <span className="relative h-16 w-[52px] flex-none overflow-hidden rounded-sm bg-raised">{p.image && <Image src={p.image} alt="" fill sizes="52px" className="object-cover" />}</span>
                <p className="min-w-0 flex-1 text-[13px] text-muted">{L('الإجمالي', 'Total')}: <span className="font-semibold text-white">{pieces(p.total)}</span><br />{L('الحد الأدنى', 'Minimum')}: {num(p.min)}</p>
              </div>
              <Grid p={p} />
              {p.low > 0 && <div className="mt-3"><Warn>{L(`محتاج نزوّد (${num(p.low)} مقاس/لون${p.out ? `، منهم ${num(p.out)} خلصان` : ''})`, `Needs restocking (${num(p.low)} size/colour${p.out ? `, ${num(p.out)} sold out` : ''})`)}</Warn></div>}
            </Card>
          ))}
          {!list.length && <div className="lg:col-span-2"><Empty text={products.data.length ? L('مفيش منتجات محتاجة تزويد', 'Nothing needs restocking') : L('لسه مفيش منتجات', 'No products yet')} icon={CheckCircle2} tone={products.data.length ? 'good' : undefined} /></div>}
        </div>
      )}
    </div>
  );
}

/** Sizes across, colours down. Below the minimum: red number and border; 0 is always red. */
function Grid({ p }: { p: Product }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-0 border-separate border-spacing-1 text-center text-sm">
        <thead><tr><th className="w-[30%] text-start text-[11px] font-normal text-muted">{L('اللون', 'Colour')}</th>{p.sizes.map((s) => <th key={s} className="text-[11px] font-normal text-muted">{sizeLabel(s)}</th>)}</tr></thead>
        <tbody>
          {p.colors.map((c) => (
            <tr key={c.id}>
              <th className="text-start text-[12px] font-normal"><span className="inline-flex items-center gap-1.5"><span className="size-3 flex-none rounded-full border border-line-strong" style={{ background: c.hex }} />{c.name}</span></th>
              {c.cells.map((n, i) => {
                const low = n != null && n < p.min;
                return <td key={i} className={`h-9 rounded-sm border tabular-nums ${n == null ? 'border-transparent text-muted' : low ? 'border-[#e5484d] font-semibold text-[#ff8a8e]' : 'border-line'}`} title={low ? L('محتاج نزوّد', 'Needs restocking') : undefined}>{n == null ? '–' : num(n)}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Move = { color_id: string; size: string; delta: number; stock_after: number | null; kind: string; reason: string | null; ref: string | null; actor: string; created_at: string };

function StockPanel({ product: p }: { product: Product }) {
  const log = useDetail<Move[]>('stock-log', { id: p.id });
  const [form, setForm] = useState({ colorId: p.colors[0]?.id ?? '', size: p.sizes[0] ?? '', dir: 'add', qty: '', reason: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const colorName = (id: string) => p.colors.find((c) => c.id === id)?.name ?? id;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Math.abs(parseInt(form.qty, 10));
    if (!qty) { setMsg({ ok: false, text: L('اكتب الكمية', 'Enter a quantity') }); return; }
    if (form.reason.trim().length < 3) { setMsg({ ok: false, text: L('اكتب السبب', 'Write a reason') }); return; }
    setBusy(true);
    const r = await act('stockAdjust', { productId: p.id, colorId: form.colorId, size: form.size, delta: form.dir === 'add' ? qty : -qty, reason: form.reason.trim() });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: L('✓ اتسجل', '✓ Saved') } : { ok: false, text: r.error ?? L('حصلت مشكلة', 'Something went wrong') });
    if (r.ok) { setForm((f) => ({ ...f, qty: '', reason: '' })); log.reload(); window.dispatchEvent(new Event('dash:refresh')); }
  };

  return (
    <div className="space-y-6">
      <Grid p={p} />
      <form onSubmit={submit} className="space-y-3 rounded-md border border-line p-3">
        <h3 className="text-sm font-medium">{L('عدّل المخزون', 'Adjust stock')}</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] text-muted">{L('اللون', 'Colour')}<select className="field mt-1" value={form.colorId} onChange={(e) => setForm({ ...form, colorId: e.target.value })}>{p.colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-[12px] text-muted">{L('المقاس', 'Size')}<select className="field mt-1" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>{p.sizes.map((s) => <option key={s} value={s}>{sizeLabel(s)}</option>)}</select></label>
          <label className="text-[12px] text-muted">{L('زوّد ولا نقّص', 'Add or remove')}<select className="field mt-1" value={form.dir} onChange={(e) => setForm({ ...form, dir: e.target.value })}><option value="add">{L('زوّد (+)', 'Add (+)')}</option><option value="remove">{L('نقّص (−)', 'Remove (−)')}</option></select></label>
          <label className="text-[12px] text-muted">{L('الكمية', 'Quantity')}<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/\D/g, '') })} required /></label>
        </div>
        <label className="block text-[12px] text-muted">{L('السبب', 'Reason')}<input className="field mt-1" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder={L('مثلًا: وصل إنتاج جديد / قطعة بايظة / جرد', 'e.g. new batch arrived / damaged piece / stock count')} required minLength={3} maxLength={300} /></label>
        <button className="btn btn-primary !min-h-11 w-full" disabled={busy}>{busy ? L('بيتسجل…', 'Saving…') : L('سجّل', 'Save')}</button>
        {msg && <p className={`text-sm ${msg.ok ? toneText.good : toneText.bad}`} role="status">{msg.text}</p>}
      </form>

      <section>
        <h3 className="mb-2 text-[13px] font-medium text-silver">{L('حركة المخزون', 'Stock movements')}</h3>
        {log.data ? (
          <DataList rows={log.data} rowKey={(m) => `${m.created_at}${m.color_id}${m.size}${m.delta}`} empty={L('لسه مفيش حركة', 'No movements yet')}
            cols={[
              { label: L('إمتى', 'When'), cell: (m) => when(m.created_at) },
              { label: L('الكمية', 'Qty'), cell: (m) => <span className={m.delta > 0 ? toneText.good : toneText.bad} dir="ltr">{m.delta > 0 ? '+' : '−'}{num(Math.abs(m.delta))}</span> },
              { label: L('المقاس واللون', 'Size & colour'), cell: (m) => `${sizeLabel(m.size)} · ${colorName(m.color_id)}` },
              { label: L('النوع', 'Type'), cell: (m) => `${kindName(m.kind)}${m.ref ? ` · ${m.ref}` : ''}` },
              { label: L('السبب / مين', 'Reason / by'), cell: (m) => `${m.reason ? `${m.reason} · ` : ''}${m.actor}`, main: true },
              { label: L('بقى', 'After'), cell: (m) => (m.stock_after == null ? '–' : num(m.stock_after)) },
            ]} />
        ) : log.failed ? <Offline /> : <Waiting />}
      </section>
    </div>
  );
}
