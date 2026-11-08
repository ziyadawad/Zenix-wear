'use client';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { useDetail, usePage } from '../data';
import { useShell } from '../App';
import { Big, Card, DataList, Offline, PAY, RankBars, StatusPill, Waiting, egp, num, pct, when } from '../ui';
import { OrderPanel } from './Orders';

type Gov = { name: string; orders: number; sales: number };
type Top = { phone: string; name: string; orders: number; spent: number; last_at: string };
type Flag = { phone: string; name: string; orders: number; cancelled: number; returned: number };

export function CustomersPage() {
  const { sec } = usePage('customers');
  const { open } = useShell();
  const nvr = sec<{ new: number; returning: number }>('newVsReturning'), govs = sec<Gov[]>('governorates'), top = sec<Top[]>('top'), flagged = sec<Flag[]>('flagged');
  const openCustomer = (c: { phone: string; name: string }) => open(`${c.name} · ${c.phone}`, <CustomerPanel phone={c.phone} />);
  const all = nvr.data ? nvr.data.new + nvr.data.returning : 0;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="عملاء الشهر ده: جداد ولا راجعين" stale={nvr.stale}>
        {nvr.data ? (
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[12px] text-muted">جداد (أول أوردر)</p><Big>{num(nvr.data.new)}</Big><p className="text-[12px] text-muted">{all ? pct(nvr.data.new / all) : '—'}</p></div>
            <div><p className="text-[12px] text-muted">راجعين يشتروا تاني</p><Big tone="good">{num(nvr.data.returning)}</Big><p className="text-[12px] text-muted">{all ? pct(nvr.data.returning / all) : '—'}</p></div>
          </div>
        ) : <Waiting failed={nvr.stale} />}
      </Card>
      <Card title="أكتر المحافظات (الشهر ده)" stale={govs.stale}
        onOpen={govs.data ? () => open('المحافظات الشهر ده', <DataList rows={govs.data!} rowKey={(g) => g.name} cols={[{ label: 'المحافظة', cell: (g) => g.name, main: true }, { label: 'أوردرات', cell: (g) => num(g.orders) }, { label: 'مبيعات', cell: (g) => egp(g.sales) }]} />) : undefined}>
        {govs.data ? <RankBars rows={govs.data.slice(0, 6).map((g) => ({ key: g.name, label: g.name, value: g.orders, text: `${num(g.orders)} أوردر · ${egp(g.sales)}` }))} empty="مفيش أوردرات الشهر ده لسه" /> : <Waiting failed={govs.stale} />}
      </Card>
      <Card title="أحسن العملاء" stale={top.stale}>
        {top.data ? (
          <DataList rows={top.data} rowKey={(c) => c.phone} onRow={openCustomer} empty="مفيش عملاء لسه"
            cols={[{ label: 'العميل', cell: (c) => c.name, main: true }, { label: 'الموبايل', cell: (c) => <span dir="ltr">{c.phone}</span> }, { label: 'أوردرات', cell: (c) => num(c.orders) }, { label: 'دفع', cell: (c) => egp(c.spent) }]} />
        ) : <Waiting failed={top.stale} />}
      </Card>
      <Card title={`عملاء خلي بالك منهم (${num(C.risk.badOrders)} أوردر ملغي/مرتجع أو أكتر)`} stale={flagged.stale} tone={flagged.data?.length ? 'bad' : 'neutral'}>
        {flagged.data ? (
          flagged.data.length ? (
            <DataList rows={flagged.data} rowKey={(c) => c.phone} onRow={openCustomer} rowTone={() => 'bad'}
              cols={[{ label: 'العميل', cell: (c) => `⚠ ${c.name}`, main: true }, { label: 'الموبايل', cell: (c) => <span dir="ltr">{c.phone}</span> }, { label: 'اتلغى', cell: (c) => num(c.cancelled) }, { label: 'مرتجع', cell: (c) => num(c.returned) }, { label: 'كل أوردراته', cell: (c) => num(c.orders) }]} />
          ) : <p className="text-sm text-[#6fd3a0]">✓ مفيش عملاء عليهم علامة</p>
        ) : <Waiting failed={flagged.stale} />}
        <p className="mt-3 text-[12px] text-muted">قبل ما تشحن كاش عند الاستلام لحد من دول، أكّد معاه الأول.</p>
      </Card>
    </div>
  );
}

type CustOrder = { id: string; number: string; total: number; status: string; payment_method: string; created_at: string; governorate: string };

function CustomerPanel({ phone }: { phone: string }) {
  const { open } = useShell();
  const d = useDetail<CustOrder[]>('customer', { phone });
  if (!d.data) return d.failed ? <Offline /> : <Waiting />;
  return (
    <DataList rows={d.data} rowKey={(o) => o.id} onRow={(o) => open(`أوردر ${o.number}`, <OrderPanel id={o.id} />)}
      rowTone={(o) => (o.status === 'cancelled' || o.status === 'returned' ? 'bad' : undefined)}
      cols={[{ label: 'رقم', cell: (o) => o.number }, { label: 'إمتى', cell: (o) => when(o.created_at) }, { label: 'الإجمالي', cell: (o) => egp(o.total) }, { label: 'الدفع', cell: (o) => PAY[o.payment_method] ?? o.payment_method }, { label: 'الحالة', cell: (o) => <StatusPill status={o.status} /> }]} />
  );
}
