'use client';
import { useState } from 'react';
import { ArrowLeftRight, Receipt, Trash2, TrendingUp, Wallet } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { act, useDetail, usePage } from '../data';
import { useShell } from '../App';
import { L, dashLang } from '../i18n';
import { Big, Card, DataList, Empty, Note, Offline, Row, Waiting, Warn, categoryName, egp, isoDayLabel, num, pieces, toneText, walletName, when } from '../ui';

export type Profit = { sales: number; delivered: number; cogs: number; missingCostPieces: number; shipping: number; expenses: number; net: number };
type WalletCard = { id: string; name: string; balance: number; inToday: number; outToday: number; last: { amount: number; note: string; created_at: string } | null };
type Expense = { id: string; date: string; category: string; amount: number; wallet: string; note: string | null; actor: string; created_at: string };
type Expenses = { list: Expense[]; total: number; byCategory: Record<string, number> };

const signed = (n: number) => <span className={n >= 0 ? toneText.good : toneText.bad} dir={dashLang() === 'en' ? 'ltr' : 'rtl'}>{n >= 0 ? '+' : '−'}{egp(Math.abs(n))}</span>;
const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());
const walletOptions = () => C.wallets.map((w) => <option key={w.id} value={w.id}>{L(w.name, w.nameEn)}</option>);
const categoryOptions = () => C.expenseCategories.map((c) => <option key={c.name} value={c.name}>{L(c.name, c.nameEn)}</option>);

export function ProfitBreakdown({ p }: { p: Profit }) {
  return (
    <div>
      <dl>
        <Row k={L(`المبيعات (${num(p.delivered)} أوردر اتسلم)`, `Sales (${num(p.delivered)} delivered)`)} v={`+ ${egp(p.sales)}`} tone="good" />
        <Row k={L('تكلفة البضاعة', 'Cost of goods')} v={`− ${egp(p.cogs)}`} tone="bad" />
        <Row k={L('الشحن (المتسلم والمرتجع)', 'Shipping (delivered & returned)')} v={`− ${egp(p.shipping)}`} tone="bad" />
        <Row k={L('المصاريف', 'Expenses')} v={`− ${egp(p.expenses)}`} tone="bad" />
        <Row k={L('صافي الربح', 'Net profit')} v={<strong>{p.net < 0 ? '− ' : ''}{egp(Math.abs(p.net))}</strong>} tone={p.net >= 0 ? 'good' : 'bad'} />
      </dl>
      {p.missingCostPieces > 0 && <div className="mt-3"><Warn>{L(`${pieces(p.missingCostPieces)} اتباعت من منتجات مالهاش سعر تكلفة، فالربح طالع أعلى من الحقيقي. ضيفه من الإدارة ← المنتجات.`, `${pieces(p.missingCostPieces)} sold without a cost price, so profit shows higher than it is. Add it in Admin → Products.`)}</Warn></div>}
      <Note className="mt-3">{L('المبيعات = الأوردرات اللي اتسلمت الشهر ده. التكلفة = سعر التكلفة الحالي. الشحن = سعر الشحن للمحافظة.', 'Sales = orders delivered this month. Cost = current cost price. Shipping = the governorate fee.')}</Note>
    </div>
  );
}

export function MoneyPage() {
  const [filter, setFilter] = useState({ month: '', category: '', wallet: '' });
  const { sec } = usePage('money', filter);
  const { open } = useShell();
  const wallets = sec<WalletCard[]>('wallets'), profit = sec<Profit>('profit'), expenses = sec<Expenses>('expenses');

  return (
    <div className="grid gap-3 md:gap-4">
      {wallets.data ? (
        <div className="grid gap-3 sm:grid-cols-2 md:gap-4 xl:grid-cols-5">
          {wallets.data.map((w) => (
            <Card key={w.id} title={w.name} icon={Wallet} stale={wallets.stale} onOpen={() => open(w.name, <WalletPanel id={w.id} />)}>
              <Big tone={w.balance < 0 ? 'bad' : 'neutral'}>{w.balance < 0 ? '−' : ''}{egp(Math.abs(w.balance))}</Big>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
                <p><span className="block text-muted">{L('دخل النهارده', 'In today')}</span><span className={toneText.good}>+{egp(w.inToday)}</span></p>
                <p><span className="block text-muted">{L('طلع النهارده', 'Out today')}</span><span className={w.outToday ? toneText.bad : 'text-muted'}>−{egp(w.outToday)}</span></p>
              </div>
              <p className="mt-2 truncate text-[12px] text-muted">{w.last ? <>{L('آخر حركة', 'Last')}: {signed(w.last.amount)} · {when(w.last.created_at)}</> : L('لسه مفيش حركة', 'No movements yet')}</p>
            </Card>
          ))}
        </div>
      ) : <Card title={L('المحافظ', 'Wallets')} icon={Wallet} stale={wallets.stale}><Waiting failed={wallets.stale} /></Card>}

      <div className="grid gap-3 md:gap-4 lg:grid-cols-2 lg:items-start">
        <Card title={L('ربح الشهر ده', 'Profit this month')} icon={TrendingUp} stale={profit.stale} onOpen={profit.data ? () => open(L('صافي الربح الشهر ده', 'Net profit this month'), <ProfitBreakdown p={profit.data!} />) : undefined}>
          {profit.data ? <ProfitBreakdown p={profit.data} /> : <Waiting failed={profit.stale} />}
        </Card>
        <div className="grid gap-3 md:gap-4">
          <Card title={L('سجّل مصروف', 'Add an expense')} icon={Receipt}><ExpenseForm /></Card>
          <Card title={L('حركة فلوس', 'Move money')} icon={ArrowLeftRight}><MoveForm /></Card>
        </div>
      </div>

      <Card title={L('المصاريف', 'Expenses')} icon={Receipt} stale={expenses.stale}>
        <div className="mb-4 grid grid-cols-1 gap-2 xs:grid-cols-3">
          <label className="text-[12px] text-muted">{L('الشهر', 'Month')}<input type="month" className="field mt-1" value={filter.month} onChange={(e) => setFilter({ ...filter, month: e.target.value })} /></label>
          <label className="text-[12px] text-muted">{L('النوع', 'Type')}<select className="field mt-1" value={filter.category} onChange={(e) => setFilter({ ...filter, category: e.target.value })}><option value="">{L('الكل', 'All')}</option>{categoryOptions()}</select></label>
          <label className="text-[12px] text-muted">{L('المحفظة', 'Wallet')}<select className="field mt-1" value={filter.wallet} onChange={(e) => setFilter({ ...filter, wallet: e.target.value })}><option value="">{L('الكل', 'All')}</option>{walletOptions()}</select></label>
        </div>
        {expenses.data ? (
          <>
            <p className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">{L('الإجمالي', 'Total')}: <strong className={toneText.bad}>{egp(expenses.data.total)}</strong>
              {Object.entries(expenses.data.byCategory).map(([k, v]) => <span key={k} className="text-[12px] text-muted">{categoryName(k)}: {egp(v)}</span>)}</p>
            <DataList rows={expenses.data.list} rowKey={(e) => e.id} empty={L('مفيش مصاريف في الفترة دي', 'No expenses in this period')}
              cols={[
                { label: L('التاريخ', 'Date'), cell: (e) => isoDayLabel(e.date) }, { label: L('النوع', 'Type'), cell: (e) => categoryName(e.category) },
                { label: L('المبلغ', 'Amount'), cell: (e) => <span className={toneText.bad}>−{egp(e.amount)}</span> }, { label: L('المحفظة', 'Wallet'), cell: (e) => walletName(e.wallet) },
                { label: L('ملاحظة', 'Note'), cell: (e) => `${e.note ?? '—'} · ${e.actor}`, main: true },
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
    <button type="button" disabled={busy} aria-label={L('امسح المصروف', 'Delete expense')} className="flex size-10 items-center justify-center text-muted hover:text-[#ff8a8e]"
      onClick={async () => { if (!confirm(L('تمسح المصروف ده؟ الفلوس هترجع للمحفظة.', 'Delete this expense? The money goes back to the wallet.'))) return; setBusy(true); const r = await act('expenseDelete', { id }); setBusy(false); if (r.ok) window.dispatchEvent(new Event('dash:refresh')); else alert(r.error); }}>
      <Trash2 size={16} />
    </button>
  );
}

function ExpenseForm() {
  const blank = () => ({ date: cairoToday(), category: C.expenseCategories[0].name as string, amount: '', wallet: C.wallets[0].id as string, note: '' });
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const r = await act('expenseAdd', { ...f, amount: parseInt(f.amount, 10) || 0, note: f.note || undefined });
    setBusy(false);
    setMsg(r.ok ? { ok: true, text: L('✓ المصروف اتسجل', '✓ Expense saved') } : { ok: false, text: r.error ?? L('حصلت مشكلة', 'Something went wrong') });
    if (r.ok) { setF(blank()); window.dispatchEvent(new Event('dash:refresh')); }
  };
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <label className="text-[12px] text-muted">{L('التاريخ', 'Date')}<input type="date" className="field mt-1" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} required /></label>
      <label className="text-[12px] text-muted">{L('النوع', 'Type')}<select className="field mt-1" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{categoryOptions()}</select></label>
      <label className="text-[12px] text-muted">{L('المبلغ (ج.م)', 'Amount (EGP)')}<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} required /></label>
      <label className="text-[12px] text-muted">{L('اتدفع من', 'Paid from')}<select className="field mt-1" value={f.wallet} onChange={(e) => setF({ ...f, wallet: e.target.value })}>{walletOptions()}</select></label>
      <label className="col-span-2 text-[12px] text-muted">{L('ملاحظة', 'Note')}<input className="field mt-1" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder={L('اختياري', 'Optional')} /></label>
      <button className="btn btn-primary col-span-2 !min-h-11" disabled={busy}>{busy ? L('بيتسجل…', 'Saving…') : L('سجّل المصروف', 'Save expense')}</button>
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
    setMsg(r.ok ? { ok: true, text: L('✓ اتسجل', '✓ Saved') } : { ok: false, text: r.error ?? L('حصلت مشكلة', 'Something went wrong') });
    if (r.ok) { setF(blank()); window.dispatchEvent(new Event('dash:refresh')); }
  };
  const sel = (k: 'from' | 'to', label: string) => (
    <label className="text-[12px] text-muted">{label}<select className="field mt-1" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })}>{walletOptions()}</select></label>
  );
  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-2">
      <label className="col-span-2 text-[12px] text-muted">{L('العملية', 'Type')}<select className="field mt-1" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
        <option value="transfer">{L('تحويل بين محفظتين (مثلًا شركة الشحن سلّمت الكاش)', 'Transfer between wallets (e.g. courier paid out)')}</option>
        <option value="in">{L('فلوس داخلة (رصيد أول المدة، تمويل…)', 'Money in (opening balance, funding…)')}</option>
        <option value="out">{L('فلوس خارجة (سحب…)', 'Money out (withdrawal…)')}</option>
      </select></label>
      {f.type !== 'in' && sel('from', L('من', 'From'))}
      {f.type !== 'out' && sel('to', L('لـ', 'To'))}
      <label className="text-[12px] text-muted">{L('المبلغ (ج.م)', 'Amount (EGP)')}<input className="field mt-1" inputMode="numeric" pattern="[0-9]*" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value.replace(/\D/g, '') })} required /></label>
      <label className={`text-[12px] text-muted ${f.type === 'transfer' ? 'col-span-2' : ''}`}>{L('ملاحظة', 'Note')}<input className="field mt-1" value={f.note} maxLength={300} onChange={(e) => setF({ ...f, note: e.target.value })} required minLength={2} /></label>
      <button className="btn btn-ghost col-span-2 !min-h-11" disabled={busy}>{busy ? L('بيتسجل…', 'Saving…') : L('سجّل', 'Save')}</button>
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
  const btn = (k: string, label: string) => <button type="button" onClick={() => setRange(k)} aria-pressed={range === k} className={`min-h-10 flex-none rounded-md border px-3 text-sm ${range === k ? 'dash-chip-on' : 'border-line-strong'}`}>{label}</button>;
  return (
    <div className="space-y-4">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">{btn('today', L('النهارده', 'Today'))}{btn('7d', L('٧ أيام', '7 days'))}{btn('month', L('الشهر ده', 'This month'))}{btn('pick', L('شهر معين', 'Pick a month'))}</div>
      {range === 'pick' && <input type="month" className="field" value={month} onChange={(e) => setMonth(e.target.value)} aria-label={L('اختار الشهر', 'Choose month')} />}
      {d.data ? (
        <>
          <dl><Row k={L('الرصيد أول الفترة', 'Opening balance')} v={egp(d.data.opening)} /><Row k={L('الرصيد آخر الفترة', 'Closing balance')} v={<strong>{egp(d.data.closing)}</strong>} /></dl>
          {!d.data.days.length && <Empty text={L('مفيش حركة في الفترة دي', 'No movements in this period')} />}
          {d.data.days.map((day) => (
            <section key={day.day} className="overflow-hidden rounded-md border border-line">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-raised px-3 py-2 text-sm">
                <strong>{isoDayLabel(day.day)}</strong>
                <span className="text-[12px] text-muted">{L('أول اليوم', 'Start')} {egp(day.opening)} {L('←', '→')} {L('آخر اليوم', 'End')} <span className="text-white">{egp(day.closing)}</span></span>
              </header>
              <ul className="divide-y divide-line/60">
                {day.moves.map((m, i) => (
                  <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                    <span className="min-w-0"><span className="block break-words">{m.note}</span><span className="block text-[11px] text-muted">{when(m.created_at)} · {m.actor}</span></span>
                    <span className="flex-none tabular-nums">{signed(m.amount)}</span>
                  </li>
                ))}
              </ul>
              <p className="flex justify-between border-t border-line px-3 py-1.5 text-[12px]"><span className={toneText.good}>{L('دخل', 'In')} +{egp(day.in)}</span><span className={toneText.bad}>{L('طلع', 'Out')} −{egp(day.out)}</span></p>
            </section>
          ))}
        </>
      ) : d.failed ? <Offline /> : <Waiting />}
    </div>
  );
}
