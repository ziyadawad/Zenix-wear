'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Minus, WifiOff, X } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../config/dashboard.config';

// ---- Formatting: Arabic, Cairo time, ج.م ---------------------------------------------------------
const nf = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 });
export const num = (n: number) => nf.format(n);
export const egp = (n: number) => `${nf.format(n)} ج.م`;
export const pct = (n: number) => `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(n * 100)}٪`;
const tz = { timeZone: 'Africa/Cairo' } as const;
export const hhmm = (d: string | Date) => new Intl.DateTimeFormat('ar-EG', { ...tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
export const dayLabel = (d: string | Date) => new Intl.DateTimeFormat('ar-EG', { ...tz, weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
export const when = (d: string | Date) => new Intl.DateTimeFormat('ar-EG', { ...tz, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(d));
/** "2026-11-08" (a Cairo calendar day) as a label, without shifting it through UTC. */
export const isoDayLabel = (day: string) => new Intl.DateTimeFormat('ar-EG', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(`${day}T12:00:00Z`));
export const ago = (d: string | Date) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  if (m < 60) return `من ${num(m)} دقيقة`;
  if (m < 60 * 24) return `من ${num(Math.floor(m / 60))} ساعة`;
  return `من ${num(Math.floor(m / 1440))} يوم`;
};
export const statusOf = (id: string) => C.orderStatuses.find((s) => s.id === id) ?? { id, label: id, tone: 'neutral' as const };
export const walletName = (id: string) => C.wallets.find((w) => w.id === id)?.name ?? id;
export const PAY: Record<string, string> = { cod: 'كاش عند الاستلام', instapay: 'إنستاباي', wallet: 'محفظة موبايل', card: 'كارت' };

export type Tone = 'good' | 'bad' | 'warn' | 'info' | 'neutral';
export const toneText: Record<Tone, string> = { good: 'text-[#6fd3a0]', bad: 'text-[#ff8a8e]', warn: 'text-[#e9bd67]', info: 'text-[#94c0ff]', neutral: 'text-muted' };
const toneBorder: Record<Tone, string> = { good: 'border-[#3bb273]/70', bad: 'border-[#e5484d]', warn: 'border-[#e9bd67]/70', info: 'border-[#6aa8ff]/60', neutral: 'border-line' };

// ---- Pieces --------------------------------------------------------------------------------------
export function Offline() {
  return <span className="inline-flex items-center gap-1 rounded-sm border border-line-strong px-1.5 py-0.5 text-[11px] text-muted"><WifiOff size={12} aria-hidden="true" />مش متصل</span>;
}

export function StatusPill({ status }: { status: string }) {
  const s = statusOf(status);
  return <span className={`inline-block whitespace-nowrap rounded-sm border px-2 py-0.5 text-[12px] ${toneBorder[s.tone as Tone]} ${toneText[s.tone as Tone]}`}>{s.label}</span>;
}

/** Change vs a previous value, always with an arrow and sign so it never relies on colour alone. */
export function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (!before && !now) return <span className="text-[12px] text-muted"><Minus size={12} className="inline" aria-hidden="true" /> {label}: مفيش فرق</span>;
  if (!before) return <span className={`text-[12px] ${toneText.good}`}><ArrowUp size={12} className="inline" aria-hidden="true" /> {label}: جديد (كان صفر)</span>;
  const d = (now - before) / before;
  const tone: Tone = d > 0.005 ? 'good' : d < -0.005 ? 'bad' : 'neutral';
  const Icon = tone === 'good' ? ArrowUp : tone === 'bad' ? ArrowDown : Minus;
  return <span className={`text-[12px] ${toneText[tone]}`}><Icon size={12} className="inline" aria-hidden="true" /> {label}: {d > 0 ? '+' : ''}{pct(d)}</span>;
}

/** A dashboard card. The whole card opens its details panel. */
export function Card({ title, stale, tone = 'neutral', onOpen, children, className = '', action }: {
  title: string; stale?: boolean; tone?: Tone; onOpen?: () => void; children: React.ReactNode; className?: string; action?: React.ReactNode;
}) {
  const open = onOpen ? { role: 'button', tabIndex: 0, onClick: onOpen, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } } } : {};
  return (
    <section {...open} aria-label={title} className={`min-w-0 border bg-surface p-4 transition-colors md:p-5 ${tone === 'bad' ? toneBorder.bad : 'border-line'} ${onOpen ? 'cursor-pointer hover:border-line-strong focus-visible:border-white' : ''} ${className}`}>
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-[13px] text-muted">{title}</h2>
        <span className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>{stale && <Offline />}{action}</span>
      </header>
      {children}
    </section>
  );
}

/** Placeholder while a card has never loaded: never a fake 0. */
export const Waiting = ({ failed }: { failed?: boolean }) => (
  <div className="flex min-h-14 items-center text-sm text-muted">{failed ? <Offline /> : <span className="h-8 w-28 animate-pulse rounded-sm bg-raised" />}</div>
);

export const Big = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: Tone }) => (
  <p className={`text-[28px] font-semibold leading-tight tracking-tight md:text-[34px] ${tone === 'neutral' ? 'text-white' : toneText[tone]}`}>{children}</p>
);

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  const p = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div>
      <div className="h-2.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
        <div className="h-full rounded-full bg-gradient-to-l from-[#e8e8e8] to-[#8f8f8f] transition-[width] duration-700" style={{ width: `${p * 100}%` }} />
      </div>
      <p className="mt-1.5 text-[12px] text-muted">{pct(p)} من التارجت ({egp(max)})</p>
    </div>
  );
}

/** Ranked horizontal bars: label, bar, value. Bars are silver; meaning is in the text, not the colour. */
export function RankBars({ rows, empty = 'مفيش بيانات لسه' }: { rows: { key: string; label: string; value: number; text: string; tone?: Tone; onClick?: () => void }[]; empty?: string }) {
  if (!rows.length) return <p className="py-3 text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const body = (
          <>
            <span className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate">{r.label}</span><span className={`flex-none tabular-nums ${r.tone ? toneText[r.tone] : 'text-silver'}`}>{r.text}</span></span>
            <span className="mt-1 block h-1.5 rounded-full bg-raised"><span className="block h-full rounded-full bg-[#c8c8c8]" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          </>
        );
        return <li key={r.key}>{r.onClick ? <button type="button" onClick={(e) => { e.stopPropagation(); r.onClick!(); }} className="block w-full text-start">{body}</button> : body}</li>;
      })}
    </ul>
  );
}

/** Single-series bar chart (silver) with a tap/hover tooltip and a hidden table for screen readers. */
export function BarChart({ data, height = 180 }: { data: { day: string; sales: number; n: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const id = useId();
  const max = Math.max(...data.map((d) => d.sales), 1);
  const W = 600, H = height, pad = 4, gap = 2;
  const bw = (W - pad * 2) / data.length - gap;
  const h = hover != null ? data[hover] : null;
  return (
    <div className="relative" dir="ltr">
      {/* Fixed height at every width: the bars stretch, the text stays in HTML so it never scales. */}
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block h-[170px] w-full md:h-[220px]" role="img" aria-labelledby={`${id}-t`} onMouseLeave={() => setHover(null)}>
        <title id={`${id}-t`}>المبيعات في آخر {num(data.length)} يوم</title>
        {[0.5, 1].map((f) => <line key={f} x1={0} x2={W} y1={H - 18 - (H - 26) * f} y2={H - 18 - (H - 26) * f} stroke="rgb(255 255 255 / .07)" vectorEffect="non-scaling-stroke" />)}
        <line x1={0} x2={W} y1={H - 18} y2={H - 18} stroke="rgb(255 255 255 / .2)" vectorEffect="non-scaling-stroke" />
        {data.map((d, i) => {
          const bh = Math.max(d.sales ? 3 : 0, ((H - 26) * d.sales) / max);
          const x = pad + i * (bw + gap);
          const r = Math.min(4, bw / 2, bh);
          const y = H - 18 - bh;
          return (
            <g key={d.day} onMouseEnter={() => setHover(i)} onClick={(e) => { e.stopPropagation(); setHover(i); }}>
              <rect x={x - gap / 2} y={0} width={bw + gap} height={H} fill="transparent" />
              {bh > 0 && <path d={`M${x},${H - 18} V${y + r} Q${x},${y} ${x + r},${y} H${x + bw - r} Q${x + bw},${y} ${x + bw},${y + r} V${H - 18} Z`} fill={hover === i ? '#ffffff' : i === data.length - 1 ? '#e6e6e6' : '#9c9c9c'} />}
            </g>
          );
        })}
      </svg>
      <div className="-mt-4 flex justify-between text-[11px] text-muted"><span>{isoDayLabel(data[0]?.day ?? '2026-01-01')}</span><span>النهارده</span></div>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-sm border border-line-strong bg-black/95 px-2.5 py-1.5 text-[12px] shadow-lg" dir="rtl"
          style={{ left: `clamp(0px, calc(${((hover! + 0.5) / data.length) * 100}% - 70px), calc(100% - 140px))`, width: 140 }}>
          <p className="text-muted">{isoDayLabel(h.day)}</p><p className="font-semibold">{egp(h.sales)}</p><p className="text-muted">{num(h.n)} أوردر</p>
        </div>
      )}
      <table className="sr-only"><caption>المبيعات اليومية</caption><tbody>{data.map((d) => <tr key={d.day}><th>{d.day}</th><td>{d.sales}</td><td>{d.n}</td></tr>)}</tbody></table>
    </div>
  );
}

/** Table on desktop, a stack of cards on phones. */
export function DataList<T>({ rows, cols, rowKey, onRow, empty = 'مفيش حاجة هنا', rowTone }: {
  rows: T[]; rowKey: (r: T) => string; onRow?: (r: T) => void; empty?: string; rowTone?: (r: T) => Tone | undefined;
  cols: { label: string; cell: (r: T) => React.ReactNode; main?: boolean; className?: string }[];
}) {
  if (!rows.length) return <p className="py-4 text-sm text-muted">{empty}</p>;
  const click = (r: T) => onRow ? { role: 'button', tabIndex: 0, onClick: (e: React.MouseEvent) => { e.stopPropagation(); onRow(r); }, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); onRow(r); } } } : {};
  return (
    <>
      <ul className="space-y-2 md:hidden">
        {rows.map((r) => (
          <li key={rowKey(r)} {...click(r)} className={`border bg-ink p-3 ${rowTone?.(r) === 'bad' ? 'border-[#e5484d]/70' : 'border-line'} ${onRow ? 'cursor-pointer active:bg-raised' : ''}`}>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm">
              {cols.map((c) => <div key={c.label} className={c.main ? 'col-span-2' : 'min-w-0'}><dt className="text-[11px] text-muted">{c.label}</dt><dd className="min-w-0 break-words">{c.cell(r)}</dd></div>)}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-line text-[12px] text-muted">{cols.map((c) => <th key={c.label} className={`px-2 py-2 text-start font-normal ${c.className ?? ''}`}>{c.label}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={rowKey(r)} {...click(r)} className={`border-b border-line/60 ${rowTone?.(r) === 'bad' ? 'bg-[#e5484d]/[.07]' : ''} ${onRow ? 'cursor-pointer hover:bg-raised' : ''}`}>
                {cols.map((c) => <td key={c.label} className={`px-2 py-2.5 align-middle ${c.className ?? ''}`}>{c.cell(r)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Details panel: full screen on phones, a side panel on desktop. Closes with ✕ or Esc. */
export function Panel({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey, true);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey, true); document.documentElement.style.overflow = ''; prev?.focus?.(); };
  }, [onClose]);
  return (
    <>
      <div className="fixed inset-0 z-[80] hidden bg-black/60 md:block" onClick={onClose} aria-hidden="true" />
      <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-[90] flex flex-col bg-ink outline-none md:inset-y-0 md:end-0 md:start-auto md:w-[min(560px,92vw)] md:border-s md:border-line">
        <div className="flex min-h-14 flex-none items-center justify-between gap-3 border-b border-line px-4">
          <h2 className="min-w-0 truncate text-base font-medium">{title}</h2>
          <button type="button" onClick={onClose} aria-label="اقفل" className="-me-2 flex size-11 flex-none items-center justify-center text-muted hover:text-white"><X size={22} /></button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">{children}</div>
      </div>
    </>
  );
}

export const Warn = ({ children }: { children: React.ReactNode }) => (
  <p className={`flex items-start gap-1.5 text-[13px] ${toneText.bad}`}><AlertTriangle size={15} className="mt-0.5 flex-none" aria-hidden="true" />{children}</p>
);

export const Row = ({ k, v, tone }: { k: string; v: React.ReactNode; tone?: Tone }) => (
  <div className="flex items-baseline justify-between gap-3 border-b border-line/60 py-2 text-sm last:border-0"><dt className="text-muted">{k}</dt><dd className={`text-end tabular-nums ${tone ? toneText[tone] : ''}`}>{v}</dd></div>
);
