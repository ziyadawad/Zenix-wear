import Image from 'next/image';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { emailConfigured, paymobEnabled } from '@/lib/services';
import { getSettings } from '@/lib/catalog';
import { Card, egp, PageHead, StatusBadge, when } from '@/components/admin/ui';
import { RemoveDemoButton } from '@/components/admin/SmallActions';

export const dynamic = 'force-dynamic';
const LOW_STOCK = 3;

export default async function Dashboard() {
  await requireAdmin();
  const CAIRO = `(now() AT TIME ZONE 'Africa/Cairo')`;
  const LOCAL = `(created_at AT TIME ZONE 'Africa/Cairo')`;
  const [totals] = await db.query(`
    SELECT
      COALESCE(sum(total) FILTER (WHERE ${LOCAL} >= date_trunc('day', ${CAIRO})), 0)::int AS today,
      count(*) FILTER (WHERE ${LOCAL} >= date_trunc('day', ${CAIRO}))::int AS today_n,
      COALESCE(sum(total) FILTER (WHERE ${LOCAL} >= date_trunc('day', ${CAIRO}) - interval '6 days'), 0)::int AS week,
      count(*) FILTER (WHERE ${LOCAL} >= date_trunc('day', ${CAIRO}) - interval '6 days')::int AS week_n,
      COALESCE(sum(total) FILTER (WHERE ${LOCAL} >= date_trunc('month', ${CAIRO})), 0)::int AS month,
      count(*) FILTER (WHERE ${LOCAL} >= date_trunc('month', ${CAIRO}))::int AS month_n
    FROM orders WHERE status <> 'cancelled'`);
  const [{ pending }] = await db.query(`SELECT count(*)::int AS pending FROM orders WHERE status = 'pending'`);
  const recent = await db.query('SELECT id, number, name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 6');
  const best = await db.query(`SELECT id, name_en, sold_count, colors FROM products ORDER BY sold_count DESC LIMIT 5`);
  const low = await db.query(`SELECT v.product_id, v.color_id, v.size, v.stock, p.name_en FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= $1 AND p.status = 'active' ORDER BY v.stock, p.name_en LIMIT 12`, [LOW_STOCK]);
  const [{ low_n }] = await db.query(`SELECT count(*)::int AS low_n FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.stock <= $1 AND p.status = 'active'`, [LOW_STOCK]);
  const [{ demo }] = await db.query(`SELECT count(*)::int AS demo FROM reviews WHERE is_demo = true`);
  const [{ waiting }] = await db.query(`SELECT count(*)::int AS waiting FROM reviews WHERE status = 'pending'`);
  const [{ unread }] = await db.query(`SELECT count(*)::int AS unread FROM messages WHERE is_read = false`);
  const settings = await getSettings();

  const checks: { ok: boolean; label: string }[] = [
    { ok: !!process.env.DATABASE_URL, label: 'Production database connected (DATABASE_URL)' },
    { ok: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), label: 'Image storage connected (Supabase)' },
    { ok: emailConfigured(), label: 'New-order emails switched on (RESEND_API_KEY)' },
    { ok: (process.env.NEXT_PUBLIC_SITE_URL ?? '').startsWith('https://'), label: 'Live domain set (NEXT_PUBLIC_SITE_URL)' },
    { ok: demo === 0, label: `Sample reviews removed (${demo} left)` },
    { ok: !!(settings.instagram || settings.tiktok || settings.facebook), label: 'Social links added (Settings)' },
    { ok: paymobEnabled(), label: 'Card payments connected (Paymob, optional)' },
  ];
  const stat = (label: string, value: number, n: number) => (
    <div className="border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-2 text-lg md:text-2xl">{egp(value)}</p>
      <p className="mt-1 text-xs text-muted">{n} {n === 1 ? 'order' : 'orders'}</p>
    </div>
  );

  return (
    <>
      <PageHead title="Dashboard" />
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        <div className="col-span-2 md:col-span-1">{stat('Sales today', totals.today, totals.today_n)}</div>
        {stat('Last 7 days', totals.week, totals.week_n)}
        {stat('This month', totals.month, totals.month_n)}
      </div>

      {(pending > 0 || waiting > 0 || unread > 0) && (
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {pending > 0 && <Link href="/admin/orders?status=pending" className="border border-[#d9a441] px-3 py-2.5 text-[#e9bd67]">{pending} new {pending === 1 ? 'order' : 'orders'} to confirm</Link>}
          {waiting > 0 && <Link href="/admin/reviews?status=pending" className="border border-line-strong px-3 py-2.5">{waiting} reviews to moderate</Link>}
          {unread > 0 && <Link href="/admin/inbox" className="border border-line-strong px-3 py-2.5">{unread} unread messages</Link>}
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Recent orders">
          {recent.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : (
            <ul className="divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/admin/orders/${o.id}`} className="flex min-h-14 items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0"><span className="block">{o.number}</span><span className="block truncate text-xs text-muted">{o.name} · {when(new Date(o.created_at).toISOString())}</span></span>
                    <span className="flex-none text-end"><span className="block">{egp(o.total)}</span><StatusBadge status={o.status} /></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Best-selling products">
          <ul className="divide-y divide-line">
            {best.map((p) => (
              <li key={p.id}>
                <Link href={`/admin/products/${p.id}`} className="flex min-h-14 items-center gap-3 py-2 text-sm">
                  <span className="relative h-12 w-10 flex-none bg-raised">{p.colors[0]?.images[0] && <Image src={p.colors[0].images[0]} alt="" fill sizes="40px" quality={70} className="object-cover" />}</span>
                  <span className="min-w-0 flex-1 truncate">{p.name_en}</span>
                  <span className="flex-none text-muted">{p.sold_count} sold</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={`Low stock alerts (${low_n})`}>
          {low.length === 0 ? <p className="text-sm text-muted">All variants are above {LOW_STOCK} pieces.</p> : (
            <ul className="divide-y divide-line">
              {low.map((v) => (
                <li key={`${v.product_id}${v.color_id}${v.size}`}>
                  <Link href={`/admin/products/${v.product_id}`} className="flex min-h-11 items-center justify-between gap-3 py-1.5 text-sm">
                    <span className="min-w-0 truncate">{v.name_en} <span className="text-xs capitalize text-muted">{v.color_id} / {v.size}</span></span>
                    <span className={v.stock === 0 ? 'flex-none text-[#ff9a9d]' : 'flex-none text-[#e9bd67]'}>{v.stock === 0 ? 'Sold out' : `${v.stock} left`}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Launch checklist">
          <ul className="space-y-2.5 text-sm">
            {checks.map((c) => (
              <li key={c.label} className="flex items-start gap-2.5">
                {c.ok ? <CheckCircle2 size={17} strokeWidth={1.25} className="mt-0.5 flex-none text-success" /> : <AlertTriangle size={17} strokeWidth={1.25} className="mt-0.5 flex-none text-[#e9bd67]" />}
                <span className={c.ok ? 'text-muted' : ''}>{c.label}</span>
              </li>
            ))}
          </ul>
          {demo > 0 && <div className="mt-4"><RemoveDemoButton /></div>}
        </Card>
      </div>
    </>
  );
}
