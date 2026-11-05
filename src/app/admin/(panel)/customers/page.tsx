import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { customerWhatsapp, normalizePhone } from '@/lib/utils';
import { PageHead, egp, when } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = '' } = await searchParams;
  // Guest buyers are identified by phone, and registered customers appear even before their first order.
  const rows = await db.query(`
    WITH o AS (
      SELECT phone, max(name) AS name, max(email) AS email, count(*)::int AS orders,
             COALESCE(sum(total) FILTER (WHERE status <> 'cancelled'), 0)::int AS spent, max(created_at) AS last_order
      FROM orders GROUP BY phone
    )
    SELECT COALESCE(c.phone, o.phone) AS phone, COALESCE(c.name, o.name) AS name, COALESCE(c.email, o.email) AS email,
           c.id AS account, COALESCE(o.orders, 0) AS orders, COALESCE(o.spent, 0) AS spent, o.last_order
    FROM customers c FULL OUTER JOIN o ON c.phone = o.phone
    ORDER BY o.last_order DESC NULLS LAST LIMIT 500`);
  const needle = q.trim().toLowerCase();
  const list = rows.filter((r) => !needle || r.name.toLowerCase().includes(needle) || r.phone.includes(normalizePhone(q)) || (r.email ?? '').toLowerCase().includes(needle));
  return (
    <>
      <PageHead title="Customers" sub={`${rows.length} total`} />
      <form className="mb-4"><input name="q" defaultValue={q} className="field" placeholder="Search name, phone or email" aria-label="Search customers" /></form>
      <ul className="divide-y divide-line border border-line bg-surface">
        {list.map((c) => (
          <li key={c.phone} className="flex items-center gap-3 p-3">
            <Link href={`/admin/orders?q=${c.phone}`} className="min-w-0 flex-1">
              <span className="block truncate text-sm">{c.name} {c.account && <span className="ms-1 border border-line px-1 text-[10px] text-muted">Account</span>}</span>
              <span className="block truncate text-xs text-muted">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
              <span className="block text-xs text-muted">{c.orders} orders · {egp(c.spent)}{c.last_order ? ` · last ${when(new Date(c.last_order).toISOString())}` : ''}</span>
            </Link>
            <a href={customerWhatsapp(c.phone, `أهلًا ${c.name.split(' ')[0]}، معاك ZENIX WEAR.`)} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp ${c.name}`} className="icon-btn flex-none border border-line"><MessageCircle size={17} strokeWidth={1.25} /></a>
          </li>
        ))}
        {list.length === 0 && <li className="p-10 text-center text-sm text-muted">No customers yet. They appear here after their first order or sign-up.</li>}
      </ul>
    </>
  );
}
