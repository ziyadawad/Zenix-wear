'use client';
import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { Big, Card, DataList, Offline, Row, Waiting, Warn, egp, isoDayLabel, num, toneText, walletName, when } from '../ui';

export type Profit = { sales: number; delivered: number; cogs: number; missingCostPieces: number; shipping: number; expenses: number; net: number };
type WalletCard = { id: string; name: string; balance: number; inToday: number; outToday: number; last: { amount: number; note: string; created_at: string } | null };
type Expense = { id: string; date: string; category: string; amount: number; wallet: string; note: string | null; actor: string; created_at: string };
type Expenses = { list: Expense[]; total: number; byCategory: Record<string, number> };

const signed = (n: number) => <span className={n >= 0 ? toneText.good : toneText.bad} dir="rtl">{n >= 0 ? '+' : '−'}{egp(Math.abs(n))}</span>;
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

export function ProfitBreakdown({ p }: { p: Profit }) {
  return (
    <div>
      <dl>
        <Row k={`المبيعات (${num(p.delivered)} أوردر اتسلم)`} v={`+ ${egp(p.sales)}`} tone="good" />
        <Row k="تكلفة البضاعة اللي اتباعت" v={`− ${egp(p.cogs)}`} tone="bad" />
        <Row k="مصاريف الشحن (المتسلم والمرتجع)" v={`− ${egp(p.shipping)}`} tone="bad" />
        <Row k="المصاريف" v={`− ${egp(p.expenses)}`} tone="bad" />
        <Row k="صافي الربح" v={<strong>{p.net < 0 ? '− ' : ''}{egp(Math.abs(p.net))}</strong>} tone={p.net >= 0 ? 'good' : 'bad'} />
      </dl>
      {p.missingCostPieces > 0 && <div className="mt-3"><Warn>{num(p.missingCostPieces)} قطعة اتباعت من منتجات مالهاش "سعر التكلفة"، فالربح طالع أعلى من الحقيقي. ضيف سعر التكلفة من الإدارة ← المنتجات.</Warn></div>}
      <p className="mt-3 text-[12px] text-muted">المبيعات = الأوردرات اللي اتسلمت الشهر ده. التكلفة بسعر التكلفة الحالي لكل منتج. الشحن = سعر الشحن للمحافظة (أو التكلفة المسجلة على الأوردر).</p>
    </div>
  );
}

export function MoneyPage() {
  const [filter, setFilter] = useState({ month: '', category: '', wallet: '' });
  const { sec } = usePage('money', filter);
  const { open } = useShell();
  const wallets = sec<WalletCard[]>('wallets'), profit = sec<Profit>('profit'), expenses = sec<Expenses>('expenses');

  return (
    <div className="grid gap-3">
      {wallets.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {wallets.data.map((w) => (
            <Card key={w.id} title={w.name} stale={wallets.stale} onOpen={() => open(w.name, <WalletPanel id={w.id} />)}>
              <Big tone={w.balance < 0 ? 'bad' : 'neutral'}>{w.balance < 0 ? '−' : ''}{egp(Math.abs(w.balance))}</Big>
              <div className="mt-2 grid grid-cols-2 gap-2 text-[12px]">
                <p><span className="block text-muted">دخل النهارده</span><span className={toneText.good}>+{egp(w.inToday)}</span></p>
                <p><span className="block text-muted">طلع النهارده</span><span className={w.outToday ? toneText.bad : 'text-muted'}>−{egp(w.outToday)}</span></p>
              </div>
              <p className="mt-2 truncate text-[12px] text-muted">{w.last ? <>آخر حركة: {signed(w.last.amount)} · {when(w.last.created_at)}</> : 'مفيش حركة لسه'}</p>
            </Card>
          ))}
        </div>
      ) : <Card title="المحافظ" stale={wallets.stale}><Waiting failed={wallets.stale} /></Card>}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="ربح الشهر ده" stale={profit.stale} onOpen={profit.data ? () => open('صافي الربح الشهر ده', <ProfitBreakdown p={profit.data!} />) : undefined}>
          {profit.data ? <ProfitBreakdown p={profit.data} /> : <Waiting failed={profit.stale} />}
        </Card>
        <div className="grid gap-3">
          <Card title="سجّل مصروف"><ExpenseForm /></Card>
          <Card title="دخّل / طلّع / حوّل فلوس"><MoveForm /></Card>
        </div>
      </div>

      <Card title="المصاريف" stale={expenses.stale}>
        <div className="mb-3 grid grid-cols-1 gap-2 xs:grid-cols-3">
          <label className="text-[12px] text-muted">الشهر<input type="month" className="field mt-1" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} /></label>
          <label className="text-[12px] text-muted">النوع<select className="field mt-1" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}><option value="">الكل</option>{C.expenseCategories.map((c) => <option key={c}>{c}</option>)}</select></label>
          <label className="text-[12px] text-muted">المحفظة<select className="field mt-1" value={filter.wallet} onChange={(e) => setFilter({ ...filter, wallet: e.target.value })}><option value="">الكل</option>{C.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
        </div>
        {expenses.data ? (
          <>
            <p className="mb-3 text-sm">الإجمالي: <strong className={toneText.bad}>{egp(expenses.data.total)}</strong>
              {Object.entries(expenses.data.byCategory).map(([k, v]) => <span key={k} className="ms-3 text-[12px] text-muted">{k}: {egp(v)}</span>)}</p>
            <DataList rows={expenses.data.list} rowKey={(e) => e.id} empty="مفيش مصاريف في الفترة دي"
              cols={[
                { label: 'التاريخ', cell: (e) => isoDayLabel(e.date) }, { label: 'النوع', cell: (e) => e.category },
                { label: 'المبلغ', cell: (e) => <span className={toneText.bad}>−{egp(e.amount)}</span> }, { label: 'المحفظة', cell: (e) => walletName(e.wallet) },
                { label: 'ملاحظة', cell: (e) => `${e.note ?? '—'} · ${e.actor}`, main: true },
                { label: '', cell: (e) => <DeleteExpense id={e.id} /> },
              ]} />
          </>
        ) : <Waiting failed={expenses.stale} />}
      </Card>
    </div>
  );
}

function DeleteExpense({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} aria-label="امسح المصروف" className="flex size-10 items-center justify-center text-muted hover:text-[#ff8a8e]"
      onClick={async () => { if (!confirm('تمسح المصروف ده؟ الفلوس هترجع للمحفظة.')) return; setBusy(true); const r = await act('expenseDelete', { id }); setBusy(false); if (r.ok) window.dispatchEvent(new Event('dash:refresh')); else alert(r.error); }}>
      <Trash2 size={16} />
    </button>
  );
}

function ExpenseForm() {
  const blank = () => ({ date: cairoToday(), category: C.expenseCategories[0] as string, amount: '', wallet: C.wallets[0].id as string, note: '' });
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await act('expenseAdd', { ...f, amount: parseInt(f.amount, 10) || 0, note: f.note || undefined });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: '✓ المصروف اتسجل' } : { ok: false, text: r.error ?? 'حصلت مشكلة' });
    if (r.ok) { setF(blank()); window.dispatchEvent(new Event('dash:refresh')); }
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <label className="text-[12px] text-muted">التاريخ<input type="date" className="field mt-1" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></label>
      <label className="text-[12px] text-muted">النوع<select className="field mt-1" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{C.expenseCategories.map((c) => <option key={c}>{c}</option>)}</select></label>
      <label className="text-[12px] text-muted">المبلغ (ج.م)<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} required /></label>
      <label className="text-[12px] text-muted">اتدفع من<select className="field mt-1" value={f.wallet} onChange={(e) => setF({ ...f, wallet: e.target.value })}>{C.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label className="col-span-2 text-[12px] text-muted">ملاحظة<input className="field mt-1" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="اختياري" /></label>
      <button className="btn btn-primary col-span-2 !min-h-11" disabled={busy}>{busy ? 'بيتسجل…' : 'سجّل المصروف'}</button>
      {msg && <p className={`col-span-2 text-sm ${msg.ok ? toneText.good : toneText.bad}`} role="status">{msg.text}</p>}
    </form>
  );
}

function MoveForm() {
  const blank = () => ({ type: 'transfer', from: 'courier', to: 'cash', amount: '', note: '' });
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await act('moneyMove', { type: f.type, from: f.type === 'in' ? undefined : f.from, to: f.type === 'out' ? undefined : f.to, amount: parseInt(f.amount, 10) || 0, note: f.note });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: '✓ اتسجل' } : { ok: false, text: r.error ?? 'حصلت مشكلة' });
    if (r.ok) { setF(blank()); window.dispatchEvent(new Event('dash:refresh')); }
  };
  const sel = (k: 'from' | 'to', label: string) => (
    <label className="text-[12px] text-muted">{label}<select className="field mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{C.wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
  );
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <label className="col-span-2 text-[12px] text-muted">العملية<select className="field mt-1" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        <option value="transfer">تحويل بين محفظتين (مثلًا شركة الشحن سلّمت الكاش)</option><option value="in">فلوس داخلة (رصيد أول المدة، تمويل…)</option><option value="out">فلوس خارجة (سحب…)</option>
      </select></label>
      {f.type !== 'in' && sel('from', 'من')}
      {f.type !== 'out' && sel('to', 'لـ')}
      <label className="text-[12px] text-muted">المبلغ (ج.م)<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} required /></label>
      <label className={`text-[12px] text-muted ${f.type === 'transfer' ? 'col-span-2' : ''}`}>ملاحظة (لازم)<input className="field mt-1" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} required minLength={2} /></label>
      <button className="btn btn-ghost col-span-2 !min-h-11" disabled={busy}>{busy ? 'بيتسجل…' : 'سجّل'}</button>
      {msg && <p className={`col-span-2 text-sm ${msg.ok ? toneText.good : toneText.bad}`} role="status">{msg.text}</p>}
    </form>
  );
}

type WalletDetail = { opening: number; closing: number; days: { day: string; opening: number; closing: number; in: number; out: number; moves: { amount: number; kind: string; note: string; actor: string; created_at: string }[] }[] };

function WalletPanel({ id }: { id: string }) {
  const [range, setRange] = useState('month');
  const [month, setMonth] = useState('');
  const r = range === 'pick' ? month : range;
  const d = useDetail<WalletDetail>('wallet', { id, range: r });
  const btn = (k: string, label: string) => <button type="button" onClick={() => setRange(k)} aria-pressed={range === k} className={`min-h-10 flex-none border px-3 text-sm ${range === k ? 'border-white bg-white text-black' : 'border-line-strong'}`}>{label}</button>;
  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">{btn('today', 'النهارده')}{btn('7d', '٧ أيام')}{btn('month', 'الشهر ده')}{btn('pick', 'شهر معين')}</div>
      {range === 'pick' && <input type="month" className="field" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="اختار الشهر" />}
      {d.data ? (
        <>
          <dl><Row k="الرصيد أول الفترة" v={egp(d.data.opening)} /><Row k="الرصيد آخر الفترة" v={<strong>{egp(d.data.closing)}</strong>} /></dl>
          {!d.data.days.length && <p className="text-sm text-muted">مفيش حركة في الفترة دي.</p>}
          {d.data.days.map((day) => (
            <section key={day.day} className="border border-line">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-raised px-3 py-2 text-sm">
                <strong>{isoDayLabel(day.day)}</strong>
                <span className="text-[12px] text-muted">أول اليوم {egp(day.opening)} ← آخر اليوم <span className="text-white">{egp(day.closing)}</span></span>
              </header>
              <ul className="divide-y divide-line/60">
                {day.moves.map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0"><span className="block break-words">{m.note}</span><span className="block text-[11px] text-muted">{when(m.created_at)} · {m.actor}</span></span>
                    <span className="flex-none tabular-nums">{signed(m.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-line px-3 py-1.5 text-[12px]"><span className={toneText.good}>دخل +{egp(day.in)}</span><span className={toneText.bad}>طلع −{egp(day.out)}</span></p>
            </section>
          ))}
        </>
      ) : d.failed ? <Offline /> : <Waiting />}
    </div>
  );
}
