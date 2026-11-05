import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, PageHead, egp } from '@/components/admin/ui';
import { PromoForm } from '@/components/admin/PromoForm';
import { PromoRowActions } from '@/components/admin/SmallActions';

export const dynamic = 'force-dynamic';

export default async function Promos() {
  await requireAdmin();
  const rows = await db.query('SELECT * FROM promo_codes ORDER BY created_at DESC');
  return (
    <>
      <PageHead title="Promo codes" />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <Card title="New code"><PromoForm /></Card>
        <ul className="h-fit divide-y divide-line border border-line bg-surface">
          {rows.map((p) => {
            const expired = p.expires_at && new Date(p.expires_at) < new Date();
            return (
              <li key={p.code} className="flex items-center justify-between gap-3 p-3.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{p.code} {!p.active && <span className="text-xs font-normal text-muted">(disabled)</span>}{expired && <span className="text-xs font-normal text-[#ff9a9d]"> (expired)</span>}</p>
                  <p className="text-xs text-muted">{p.type === 'percent' ? `${p.value}% off` : `${egp(p.value)} off`}{p.min_subtotal ? ` · min ${egp(p.min_subtotal)}` : ''}{p.first_order_only ? ' · first order only' : ''}</p>
                  <p className="text-xs text-muted">Used {p.used_count}{p.usage_limit ? ` of ${p.usage_limit}` : ''}{p.expires_at ? ` · ends ${new Date(p.expires_at).toLocaleDateString('en-GB', { timeZone: 'Africa/Cairo' })}` : ''}</p>
                </div>
                <PromoRowActions code={p.code} active={p.active} />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
}
