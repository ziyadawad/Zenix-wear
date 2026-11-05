import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { ORDER_STATUSES } from '@/lib/types';
import { normalizePhone } from '@/lib/utils';
import { PageHead, StatusBadge, Tabs, egp, when } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireAdmin();
  const { status = 'all', q = '' } = await searchParams;
  const where: string[] = [];
  const params: unknown[] = [];
  if ((ORDER_STATUSES as readonly string[]).includes(status)) { params.push(status); where.push(`status = $${params.length}`); }
  if (q.trim()) {
    params.push(`%${q.trim().toUpperCase()}%`, `%${normalizePhone(q)}%`, `%${q.trim()}%`);
    where.push(`(number ILIKE $${params.length - 2} OR phone LIKE $${params.length - 1} OR name ILIKE $${params.length})`);
  }
  const rows = await db.query(`SELECT id, number, name, phone, total, status, payment_method, payment_status, created_at FROM orders ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT 200`, params);
  const counts = await db.query(`SELECT status, count(*)::int AS n FROM orders GROUP BY status`);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  return (
    <>
      <PageHead title="Orders" />
      <Tabs active={status} items={[{ key: 'all', href: '/admin/orders', label: 'All', count: counts.reduce((a, c) => a + c.n, 0) }, ...ORDER_STATUSES.map((s) => ({ key: s, href: `/admin/orders?status=${s}`, label: s, count: count(s) }))]} />
      <form className="mb-4"><input type="hidden" name="status" value={status} /><input name="q" defaultValue={q} className="field" placeholder="Search order number, phone or name" aria-label="Search orders" /></form>
      <ul className="divide-y divide-line border border-line bg-surface">
        {rows.map((o) => (
          <li key={o.id}>
            <Link href={`/admin/orders/${o.id}`} className="flex items-center justify-between gap-3 p-3.5 hover:bg-raised">
              <span className="min-w-0">
                <span className="block text-sm">{o.number} <span className="text-muted">· {o.name}</span></span>
                <span className="block truncate text-xs text-muted">{o.phone} · {when(new Date(o.created_at).toISOString())} · {o.payment_method.toUpperCase()}{o.payment_status === 'proof-submitted' ? ' · check transfer' : o.payment_status === 'paid' ? ' · paid' : ''}</span>
              </span>
              <span className="flex-none text-end"><span className="block text-sm">{egp(o.total)}</span><StatusBadge status={o.status} /></span>
            </Link>
          </li>
        ))}
        {rows.length === 0 && <li className="p-10 text-center text-sm text-muted">No orders found.</li>}
      </ul>
    </>
  );
}
