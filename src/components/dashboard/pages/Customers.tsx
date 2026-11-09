'use client';
import { Crown, MapPin, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { DASHBOARD_CONFIG as C } from '../../../../config/dashboard.config';
import { useDetail, usePage } from '../data';
import { useShell } from '../App';
import { L } from '../i18n';
import { Big, Card, DataList, Empty, Note, Offline, RankBars, StatusPill, Waiting, egp, num, ordersN, payName, pct, when } from '../ui';
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
  const noOrders = L('لسه مفيش أوردرات الشهر ده', 'No orders this month yet');

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
      <Card title={L('عملاء الشهر: جداد ولا راجعين', 'Customers this month: new vs returning')} icon={UserPlus} stale={nvr.stale}>
        {nvr.data ? (all ? (
          <div className="grid grid-cols-2 gap-3">
            <div><p className="mb-1.5 text-[12px] text-muted">{L('جداد (أول أوردر)', 'New (first order)')}</p><Big>{num(nvr.data.new)}</Big><Note>{pct(nvr.data.new / all)}</Note></div>
            <div><p className="mb-1.5 text-[12px] text-muted">{L('راجعين يشتروا تاني', 'Returning')}</p><Big tone="good">{num(nvr.data.returning)}</Big><Note>{pct(nvr.data.returning / all)}</Note></div>
          </div>
        ) : <Empty text={noOrders} icon={UserPlus} />) : <Waiting failed={nvr.stale} />}
      </Card>
      <Card title={L('أكتر المحافظات الشهر ده', 'Top governorates this month')} icon={MapPin} stale={govs.stale}
        onOpen={govs.data?.length ? () => open(L('المحافظات الشهر ده', 'Governorates this month'), <DataList rows={govs.data!} rowKey={(g) => g.name} cols={[{ label: L('المحافظة', 'Governorate'), cell: (g) => g.name, main: true }, { label: L('أوردرات', 'Orders'), cell: (g) => num(g.orders) }, { label: L('مبيعات', 'Sales'), cell: (g) => egp(g.sales) }]} />) : undefined}>
        {govs.data ? <RankBars rows={govs.data.slice(0, 6).map((g) => ({ key: g.name, label: g.name, value: g.orders, text: `${ordersN(g.orders)} · ${egp(g.sales)}` }))} empty={noOrders} /> : <Waiting failed={govs.stale} />}
      </Card>
      <Card title={L('أحسن العملاء', 'Top customers')} icon={Crown} stale={top.stale}>
        {top.data ? (
          <DataList rows={top.data} rowKey={(c) => c.phone} onRow={openCustomer} empty={L('لسه مفيش عملاء', 'No customers yet')}
            cols={[{ label: L('العميل', 'Customer'), cell: (c) => c.name, main: true }, { label: L('الموبايل', 'Phone'), cell: (c) => <span dir="ltr">{c.phone}</span> }, { label: L('أوردرات', 'Orders'), cell: (c) => num(c.orders) }, { label: L('دفع', 'Spent'), cell: (c) => egp(c.spent) }]} />
        ) : <Waiting failed={top.stale} />}
      </Card>
      <Card title={L('عملاء خلي بالك منهم', 'Customers to watch')} icon={ShieldAlert} stale={flagged.stale} tone={flagged.data?.length ? 'bad' : 'neutral'}>
        {flagged.data ? (
          flagged.data.length ? (
            <DataList rows={flagged.data} rowKey={(c) => c.phone} onRow={openCustomer} rowTone={() => 'bad'}
              cols={[{ label: L('العميل', 'Customer'), cell: (c) => `⚠ ${c.name}`, main: true }, { label: L('الموبايل', 'Phone'), cell: (c) => <span dir="ltr">{c.phone}</span> }, { label: L('اتلغى', 'Cancelled'), cell: (c) => num(c.cancelled) }, { label: L('مرتجع', 'Returned'), cell: (c) => num(c.returned) }, { label: L('كل أوردراته', 'All orders'), cell: (c) => num(c.orders) }]} />
          ) : <Empty text={L('مفيش عملاء عليهم علامة', 'No flagged customers')} icon={ShieldCheck} tone="good" />
        ) : <Waiting failed={flagged.stale} />}
        <Note className="mt-3">{L(`اللي عنده ${num(C.risk.badOrders)} أوردر ملغي أو مرتجع أو أكتر. أكّد معاه قبل ما تشحن كاش عند الاستلام.`, `${num(C.risk.badOrders)}+ cancelled or returned orders. Confirm with them before shipping cash on delivery.`)}</Note>
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
    <DataList rows={d.data} rowKey={(o) => o.id} onRow={(o) => open(L(`أوردر ${o.number}`, `Order ${o.number}`), <OrderPanel id={o.id} />)}
      rowTone={(o) => (o.status === 'cancelled' || o.status === 'returned' ? 'bad' : undefined)}
      cols={[{ label: L('رقم', 'No.'), cell: (o) => o.number }, { label: L('إمتى', 'When'), cell: (o) => when(o.created_at) }, { label: L('الإجمالي', 'Total'), cell: (o) => egp(o.total) }, { label: L('الدفع', 'Payment'), cell: (o) => payName(o.payment_method) }, { label: L('الحالة', 'Status'), cell: (o) => <StatusPill status={o.status} /> }]} />
  );
}
