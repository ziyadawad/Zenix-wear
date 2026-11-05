import Link from 'next/link';
import { cx } from '@/lib/utils';

export function PageHead({ title, action, sub }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="display text-2xl md:text-3xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}
export function Card({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cx('border border-line bg-surface p-4 md:p-5', className)}>
      {title && <h2 className="eyebrow mb-4">{title}</h2>}
      {children}
    </section>
  );
}
const STATUS: Record<string, string> = {
  pending: 'border-[#d9a441] text-[#e9bd67]', confirmed: 'border-[#6aa8ff] text-[#94c0ff]', shipped: 'border-[#b08cff] text-[#c8aeff]',
  delivered: 'border-success text-[#6fd3a0]', cancelled: 'border-danger text-[#ff9a9d]',
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={cx('inline-block border px-2 py-0.5 text-[11px] capitalize', STATUS[status] ?? 'border-line text-muted')}>{status}</span>;
}
export function Tabs({ items, active }: { items: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto border-b border-line">
      {items.map((i) => (
        <Link key={i.key} href={i.href} className={cx('-mb-px flex min-h-11 flex-none items-center gap-1.5 border-b px-3 text-sm capitalize', active === i.key ? 'border-white text-white' : 'border-transparent text-muted')}>
          {i.label}{i.count != null && <span className="text-xs text-muted">{i.count}</span>}
        </Link>
      ))}
    </div>
  );
}
export const egp = (n: number) => `${new Intl.NumberFormat('en-EG').format(n)} EGP`;
export const when = (iso: string) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Cairo' }).format(new Date(iso));
