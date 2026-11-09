'use client';
import { BarChart3, Banknote, CalendarRange, Clock, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { usePage } from '../data';
import { useShell } from '../App';
import { L } from '../i18n';
import { BarChart, Big, Card, DataList, Delta, Empty, Note, Progress, Row, StatusPill, Waiting, Warn, ago, egp, hhmm, isoDayLabel, num, ordersN } from '../ui';
import { OrderPanel } from './Orders';
import { ProfitBreakdown, type Profit } from './Money';

type Today = { sales: number; orders: number; aov: number; yesterday: { sales: number; orders: number }; lastWeek: { sales: number; orders: number }; list: { id: string; number: string; name: string; total: number; status: string; created_at: string }[] };
type Month = { sales: number; orders: number; target: number; days: { day: string; sales: number; n: number }[] };
type Pending = { count: number; overdue: number; limitHours: number; list: { id: string; number: string; name: string; phone: string; total: number; created_at: string; hours: number }[] };
type Day = { day: string; sales: number; n: number };

export function OverviewPage() {
  const { sec } = usePage('overview');
  const { open } = useShell();
  const today = sec<Today>('today'), month = sec<Month>('month'), pending = sec<Pending>('needsConfirm'), chart = sec<Day[]>('chart'), profit = sec<Profit>('profit');
  const t = today.data, m = month.data, p = pending.data;
  const noOrdersToday = L('لسه مفيش أوردرات النهارده', 'No orders yet today');

  const openOrder = (id: string, number: string) => open(L(`أوردر ${number}`, `Order ${number}`), <OrderPanel id={id} />);
  const todayList = () => open(L('أوردرات النهارده', "Today's orders"), t && (
    <DataList rows={t.list} rowKey={(o) => o.id} onRow={(o) => openOrder(o.id, o.number)} empty={noOrdersToday}
      cols={[{ label: L('رقم', 'No.'), cell: (o) => o.number }, { label: L('الوقت', 'Time'), cell: (o) => hhmm(o.created_at) }, { label: L('العميل', 'Customer'), cell: (o) => o.name, main: true }, { label: L('الإجمالي', 'Total'), cell: (o) => egp(o.total) }, { label: L('الحالة', 'Status'), cell: (o) => <StatusPill status={o.status} /> }]} />
  ));

  return (
    <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-4">
      <Card title={L('مبيعات النهارده', "Today's sales")} icon={Banknote} stale={today.stale} onOpen={t ? todayList : undefined} className="xl:col-span-2">
        {t ? (
          <>
            <Big>{egp(t.sales)}</Big>
            <div className="mt-3 flex flex-col gap-1"><Delta now={t.sales} before={t.yesterday.sales} label={L('مقارنة بإمبارح لنفس الساعة', 'vs yesterday, same time')} /><Delta now={t.sales} before={t.lastWeek.sales} label={L('مقارنة بنفس اليوم الأسبوع اللي فات', 'vs same day last week')} /></div>
          </>
        ) : <Waiting failed={today.stale} />}
      </Card>
      <Card title={L('أوردرات النهارده', "Today's orders")} icon={ShoppingBag} stale={today.stale} onOpen={t ? todayList : undefined}>
        {t ? (t.orders ? <><Big>{num(t.orders)}</Big><div className="mt-3"><Delta now={t.orders} before={t.yesterday.orders} label={L('مقارنة بإمبارح', 'vs yesterday')} /></div></> : <Empty text={noOrdersToday} icon={ShoppingBag} />) : <Waiting failed={today.stale} />}
      </Card>
      <Card title={L('متوسط الأوردر', 'Average order')} icon={Receipt} stale={today.stale} onOpen={t ? todayList : undefined}>
        {t ? <><Big>{egp(t.aov)}</Big><Note>{L('مبيعات النهارده ÷ عدد الأوردرات', "Today's sales ÷ number of orders")}</Note></> : <Waiting failed={today.stale} />}
      </Card>

      <Card title={L('محتاج تأكيد', 'Needs confirming')} icon={Clock} stale={pending.stale} tone={p && p.overdue > 0 ? 'bad' : 'neutral'}
        onOpen={p ? () => open(L('أوردرات محتاجة تأكيد', 'Orders to confirm'), (
          <DataList rows={p.list} rowKey={(o) => o.id} onRow={(o) => openOrder(o.id, o.number)} empty={L('مفيش أوردرات مستنية تأكيد', 'No orders waiting')} rowTone={(o) => (o.hours > p.limitHours ? 'bad' : undefined)}
            cols={[{ label: L('رقم', 'No.'), cell: (o) => o.number }, { label: L('مستني', 'Waiting'), cell: (o) => <span className={o.hours > p.limitHours ? 'text-[#ff8a8e]' : ''}>{o.hours > p.limitHours && '⚠ '}{ago(o.created_at)}</span> }, { label: L('العميل', 'Customer'), cell: (o) => o.name, main: true }, { label: L('الإجمالي', 'Total'), cell: (o) => egp(o.total) }]} />
        )) : undefined}>
        {p ? (
          <>
            <Big tone={p.overdue ? 'bad' : p.count ? 'warn' : 'good'}>{num(p.count)} <span className="text-base font-normal">{L('أوردر جديد', p.count === 1 ? 'new order' : 'new orders')}</span></Big>
            {p.overdue > 0
              ? <div className="mt-3"><Warn>{L(`${num(p.overdue)} مستنيين أكتر من ${num(p.limitHours)} ساعة`, `${num(p.overdue)} waiting over ${num(p.limitHours)} h`)}</Warn></div>
              : <Note>{p.count ? L(`كلهم أقل من ${num(p.limitHours)} ساعة`, `All under ${num(p.limitHours)} h`) : L('كله متأكد ✓', 'All confirmed ✓')}</Note>}
          </>
        ) : <Waiting failed={pending.stale} />}
      </Card>

      <Card title={L('الشهر ده', 'This month')} icon={CalendarRange} stale={month.stale} className="md:col-span-2"
        onOpen={m ? () => open(L('مبيعات الشهر يوم بيوم', 'This month, day by day'), (
          <>
            <dl><Row k={L('مبيعات الشهر', 'Sales this month')} v={egp(m.sales)} /><Row k={L('عدد الأوردرات', 'Orders')} v={num(m.orders)} /><Row k={L('التارجت', 'Target')} v={egp(m.target)} /><Row k={L('فاضل للتارجت', 'Left to target')} v={egp(Math.max(0, m.target - m.sales))} /></dl>
            <h3 className="mb-2 mt-5 text-[13px] text-muted">{L('يوم بيوم', 'Day by day')}</h3>
            <DataList rows={m.days} rowKey={(d) => d.day} cols={[{ label: L('اليوم', 'Day'), cell: (d) => isoDayLabel(d.day) }, { label: L('المبيعات', 'Sales'), cell: (d) => egp(d.sales) }, { label: L('الأوردرات', 'Orders'), cell: (d) => num(d.n) }]} />
          </>
        )) : undefined}>
        {m ? (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end sm:gap-8">
            <div><Big>{egp(m.sales)}</Big><Note>{ordersN(m.orders)}</Note></div>
            <Progress value={m.sales} max={m.target} label={L('التقدم ناحية تارجت الشهر', 'Progress to monthly target')} />
          </div>
        ) : <Waiting failed={month.stale} />}
      </Card>

      <Card title={L('صافي الربح الشهر ده', 'Net profit this month')} icon={TrendingUp} stale={profit.stale} className="md:col-span-2 xl:col-span-1" onOpen={profit.data ? () => open(L('صافي الربح الشهر ده', 'Net profit this month'), <ProfitBreakdown p={profit.data!} />) : undefined}>
        {profit.data ? (
          <>
            <Big tone={profit.data.net >= 0 ? 'good' : 'bad'}>{profit.data.net < 0 ? '−' : ''}{egp(Math.abs(profit.data.net))}</Big>
            <Note>{L('المبيعات المتسلمة − تكلفة البضاعة − الشحن − المصاريف', 'Delivered sales − cost of goods − shipping − expenses')}</Note>
          </>
        ) : <Waiting failed={profit.stale} />}
      </Card>

      <Card title={L('المبيعات آخر ٣٠ يوم', 'Sales, last 30 days')} icon={BarChart3} stale={chart.stale} className="md:col-span-2 xl:col-span-4"
        onOpen={chart.data ? () => open(L('المبيعات آخر ٣٠ يوم', 'Sales, last 30 days'), (
          <DataList rows={[...chart.data!].reverse()} rowKey={(d) => d.day} cols={[{ label: L('اليوم', 'Day'), cell: (d) => isoDayLabel(d.day) }, { label: L('المبيعات', 'Sales'), cell: (d) => egp(d.sales) }, { label: L('الأوردرات', 'Orders'), cell: (d) => num(d.n) }]} />
        )) : undefined}>
        {chart.data ? (
          <>
            <BarChart data={chart.data} />
            <Note>{L('الإجمالي', 'Total')}: {egp(chart.data.reduce((a, d) => a + d.sales, 0))} · {ordersN(chart.data.reduce((a, d) => a + d.n, 0))} · {L('دوس على أي عمود تشوف اليوم', 'Tap a bar to see the day')}</Note>
          </>
        ) : <Waiting failed={chart.stale} />}
      </Card>
    </div>
  );
}
