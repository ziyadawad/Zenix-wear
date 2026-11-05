import Image from 'next/image';
import { Star } from 'lucide-react';
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { toReview } from '@/lib/catalog';
import { PageHead, Tabs, when } from '@/components/admin/ui';
import { ReviewActions, RemoveDemoButton } from '@/components/admin/SmallActions';

export const dynamic = 'force-dynamic';

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status = 'pending' } = await searchParams;
  const safe = ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending';
  const rows = await db.query(`SELECT r.*, p.name_en AS product FROM reviews r LEFT JOIN products p ON p.id = r.product_id WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT 100`, [safe]);
  const counts = await db.query('SELECT status, count(*)::int AS n FROM reviews GROUP BY status');
  const [{ demo }] = await db.query('SELECT count(*)::int AS demo FROM reviews WHERE is_demo = true');
  return (
    <>
      <PageHead title="Reviews" />
      {demo > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-[#d9a441]/60 p-3 text-sm">
          <p>{demo} sample reviews are showing, labelled “Sample review”. Remove them before launch.</p>
          <div className="w-full sm:w-auto"><RemoveDemoButton /></div>
        </div>
      )}
      <Tabs active={safe} items={['pending', 'approved', 'rejected'].map((s) => ({ key: s, href: `/admin/reviews?status=${s}`, label: s === 'rejected' ? 'hidden' : s, count: counts.find((c) => c.status === s)?.n ?? 0 }))} />
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((row) => {
          const r = toReview(row);
          return (
            <li key={r.id} className="flex gap-3 border border-line bg-surface p-3.5">
              {r.image && <span className="relative h-20 w-16 flex-none bg-raised"><Image src={r.image} alt="" fill sizes="64px" quality={70} className="object-cover" /></span>}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 text-sm">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} size={13} fill="#e8e8e8" strokeWidth={0} />)}<span className="ms-2 truncate text-xs text-muted">{when(r.createdAt)}</span></p>
                <p className="mt-2 text-sm leading-relaxed">{r.body}</p>
                <p className="mt-1 text-xs text-muted">{r.name}{r.city ? ` · ${r.city}` : ''}{row.product ? ` · ${row.product}` : ''}{r.isDemo ? ' · Sample' : ''}{r.onHome ? ' · On homepage' : ''}</p>
                <div className="mt-3"><ReviewActions id={r.id} status={r.status} onHome={r.onHome} /></div>
              </div>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-10 text-center text-sm text-muted lg:col-span-2">Nothing here.</li>}
      </ul>
    </>
  );
}
