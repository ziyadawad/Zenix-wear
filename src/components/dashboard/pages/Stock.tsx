'use client';
import { useState } from 'react';
import Image from 'next/image';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { Big, Card, DataList, Offline, Waiting, Warn, egp, num, toneText, when } from '../ui';

type Product = { id: string; slug: string; name: string; image: string | null; live: boolean; price: number; cost: number | null; min: number; sizes: string[]; colors: { id: string; name: string; hex: string; cells: (number | null)[] }[]; total: number; low: number; out: number };
type Totals = { pieces: number; atCost: number; atPrice: number; piecesWithoutCost: number };
const KIND: Record<string, string> = { sale: 'اتباع', cancel: 'رجع (إلغاء)', return: 'رجع (مرتجع)', reopen: 'اتسحب تاني (رجوع أوردر)', manual: 'تعديل يدوي', edit: 'تعديل من صفحة المنتج' };

export function StockPage() {
  const { sec } = usePage('stock');
  const { open } = useShell();
  const products = sec<Product[]>('products'), totals = sec<Totals>('totals');
  const [onlyLow, setOnlyLow] = useState(false);
  const list = (products.data ?? []).filter((p) => !onlyLow || p.low > 0);
  const lowCount = (products.data ?? []).reduce((a, p) => a + p.low, 0);

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="إجمالي القطع في المخزن" stale={totals.stale}>{totals.data ? <Big>{num(totals.data.pieces)}</Big> : <Waiting failed={totals.stale} />}</Card>
        <Card title="قيمة المخزون بسعر التكلفة" stale={totals.stale}>
          {totals.data ? <><Big>{egp(totals.data.atCost)}</Big>{totals.data.piecesWithoutCost > 0 && <p className="mt-1 text-[12px] text-[#e9bd67]">⚠ {num(totals.data.piecesWithoutCost)} قطعة منتجاتها من غير سعر تكلفة</p>}</> : <Waiting failed={totals.stale} />}
        </Card>
        <Card title="قيمة المخزون بسعر البيع" stale={totals.stale}>{totals.data ? <Big>{egp(totals.data.atPrice)}</Big> : <Waiting failed={totals.stale} />}</Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={`text-sm ${lowCount ? toneText.bad : 'text-muted'}`}>{products.data ? (lowCount ? `⚠ ${num(lowCount)} مقاس/لون محتاج نزوّد` : '✓ كل المقاسات فوق الحد الأدنى') : ''} {products.stale && <Offline />}</p>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="size-4 accent-white" />اعرض اللي محتاج نزوّد بس</label>
      </div>

      {!products.data ? <Card title="المنتجات" stale={products.stale}><Waiting failed={products.stale} /></Card> : (
        <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((p) => (
            <Card key={p.id} title={p.live ? 'معروض في الموقع' : 'مخفي (مسودة)'} tone={p.low ? 'bad' : 'neutral'} onOpen={() => open(p.name, <StockPanel product={p} />)}>
              <div className="mb-3 flex items-center gap-3">
                <span className="relative h-16 w-[52px] flex-none bg-raised">{p.image && <Image src={p.image} alt="" fill sizes="52px" className="object-cover" />}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-[12px] text-muted">الإجمالي: <span className="text-white">{num(p.total)}</span> قطعة · الحد الأدنى {num(p.min)}</p></div>
              </div>
              <Grid p={p} />
              {p.low > 0 && <div className="mt-2"><Warn>محتاج نزوّد ({num(p.low)} مقاس/لون{p.out ? `، منهم ${num(p.out)} خلصان` : ''})</Warn></div>}
            </Card>
          ))}
          {!list.length && <p className="text-sm text-muted">مفيش منتجات محتاجة تزويد.</p>}
        </div>
      )}
    </div>
  );
}

/** Sizes across, colours down. Below the minimum: red number and border; 0 is always red. */
function Grid({ p }: { p: Product }) {
  return (
    <div className="overflow-x-auto" dir="rtl">
      <table className="w-full min-w-0 border-separate border-spacing-1 text-center text-sm">
        <thead><tr><th className="w-[30%] text-start text-[11px] font-normal text-muted">اللون</th>{p.sizes.map((s) => <th key={s} className="text-[11px] font-normal text-muted">{s === 'ONE' ? 'مقاس واحد' : s}</th>)}</tr></thead>
        <tbody>
          {p.colors.map((c) => (
            <tr key={c.id}>
              <th className="text-start text-[12px] font-normal"><span className="inline-flex items-center gap-1.5"><span className="size-3 flex-none rounded-full border border-line-strong" style={{ background: c.hex }} />{c.name}</span></th>
              {c.cells.map((n, i) => {
                const low = n != null && n < p.min;
                return <td key={i} className={`h-9 border tabular-nums ${n == null ? 'border-transparent text-muted' : low ? 'border-[#e5484d] font-semibold text-[#ff8a8e]' : 'border-line'}`} title={low ? 'محتاج نزوّد' : undefined}>{n == null ? '–' : num(n)}</td>;
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
    if (!qty) { setMsg({ ok: false, text: 'اكتب الكمية' }); return; }
    if (form.reason.trim().length < 3) { setMsg({ ok: false, text: 'السبب لازم يتكتب' }); return; }
    setBusy(true);
    const r = await act('stockAdjust', { productId: p.id, colorId: form.colorId, size: form.size, delta: form.dir === 'add' ? qty : -qty, reason: form.reason.trim() });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: '✓ اتسجل. الأرقام هتتحدث دلوقتي.' } : { ok: false, text: r.error ?? 'حصلت مشكلة' });
    if (r.ok) { setForm((f) => ({ ...f, qty: '', reason: '' })); log.reload(); window.dispatchEvent(new Event('dash:refresh')); }
  };

  return (
    <div className="space-y-6">
      <Grid p={p} />
      <form onSubmit={submit} className="space-y-3 border border-line p-3">
        <h3 className="text-sm font-medium">تعديل المخزون يدوي</h3>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-[12px] text-muted">اللون<select className="field mt-1" value={form.colorId} onChange={(e) => setForm({ ...form, colorId: e.target.value })}>{p.colors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className="text-[12px] text-muted">المقاس<select className="field mt-1" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>{p.sizes.map((s) => <option key={s} value={s}>{s === 'ONE' ? 'مقاس واحد' : s}</option>)}</select></label>
          <label className="text-[12px] text-muted">زوّد ولا نقّص<select className="field mt-1" value={form.dir} onChange={(e) => setForm({ ...form, dir: e.target.value })}><option value="add">زوّد (+)</option><option value="remove">نقّص (−)</option></select></label>
          <label className="text-[12px] text-muted">الكمية<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value.replace(/\D/g, '') })} required /></label>
        </div>
        <label className="block text-[12px] text-muted">السبب (لازم)<input className="field mt-1" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="مثلًا: وصل إنتاج جديد / قطعة بايظة / جرد" required minLength={3} maxLength={300} /></label>
        <button className="btn btn-primary !min-h-11 w-full" disabled={busy}>{busy ? 'بيتسجل…' : 'سجّل التعديل'}</button>
        {msg && <p className={`text-sm ${msg.ok ? toneText.good : toneText.bad}`} role="status">{msg.text}</p>}
      </form>

      <section>
        <h3 className="mb-2 text-[13px] text-muted">حركة المخزون (اتباع، رجع، تعديل)</h3>
        {log.data ? (
          <DataList rows={log.data} rowKey={(m) => `${m.created_at}${m.color_id}${m.size}${m.delta}`} empty="مفيش حركة متسجلة لسه"
            cols={[
              { label: 'إمتى', cell: (m) => when(m.created_at) },
              { label: 'الكمية', cell: (m) => <span className={m.delta > 0 ? toneText.good : toneText.bad} dir="ltr">{m.delta > 0 ? '+' : '−'}{num(Math.abs(m.delta))}</span> },
              { label: 'المقاس واللون', cell: (m) => `${m.size} · ${colorName(m.color_id)}` },
              { label: 'النوع', cell: (m) => `${KIND[m.kind] ?? m.kind}${m.ref ? ` · ${m.ref}` : ''}` },
              { label: 'السبب / مين', cell: (m) => `${m.reason ? `${m.reason} · ` : ''}${m.actor}`, main: true },
              { label: 'بقى', cell: (m) => (m.stock_after == null ? '–' : num(m.stock_after)) },
            ]} />
        ) : log.failed ? <Offline /> : <Waiting />}
      </section>
    </div>
  );
}
