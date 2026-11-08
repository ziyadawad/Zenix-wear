'use client';
import { usePage } from '../data';
import { useShell } from '../App';
import { BarChart, Big, Card, DataList, Delta, Progress, Row, StatusPill, Waiting, Warn, ago, egp, hhmm, isoDayLabel, num } from '../ui';
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

  const openOrder = (id: string, number: string) => open(`أوردر ${number}`, <OrderPanel id={id} />);
  const todayList = () => open('أوردرات النهارده', t && (
    <DataList rows={t.list} rowKey={(o) => o.id} onRow={(o) => openOrder(o.id, o.number)} empty="مفيش أوردرات النهارده لسه"
      cols={[{ label: 'رقم', cell: (o) => o.number }, { label: 'الوقت', cell: (o) => hhmm(o.created_at) }, { label: 'العميل', cell: (o) => o.name, main: true }, { label: 'الإجمالي', cell: (o) => egp(o.total) }, { label: 'الحالة', cell: (o) => <StatusPill status={o.status} /> }]} />
  ));

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <Card title="مبيعات النهارده" stale={today.stale} onOpen={t ? todayList : undefined} className="xl:col-span-2">
        {t ? (
          <>
            <Big>{egp(t.sales)}</Big>
            <div className="mt-2 flex flex-col gap-0.5"><Delta now={t.sales} before={t.yesterday.sales} label="مقارنة بإمبارح لحد نفس الساعة" /><Delta now={t.sales} before={t.lastWeek.sales} label="مقارنة بنفس اليوم الأسبوع اللي فات" /></div>
          </>
        ) : <Waiting failed={today.stale} />}
      </Card>
      <Card title="أوردرات النهارده" stale={today.stale} onOpen={t ? todayList : undefined}>
        {t ? <><Big>{num(t.orders)}</Big><div className="mt-2"><Delta now={t.orders} before={t.yesterday.orders} label="مقارنة بإمبارح" /></div></> : <Waiting failed={today.stale} />}
      </Card>
      <Card title="متوسط الأوردر" stale={today.stale} onOpen={t ? todayList : undefined}>
        {t ? <><Big>{egp(t.aov)}</Big><p className="mt-2 text-[12px] text-muted">مبيعات النهارده ÷ عدد الأوردرات</p></> : <Waiting failed={today.stale} />}
      </Card>

      <Card title="محتاج تأكيد" stale={pending.stale} tone={p && p.overdue > 0 ? 'bad' : 'neutral'}
        onOpen={p ? () => open('أوردرات محتاجة تأكيد', (
          <DataList rows={p.list} rowKey={(o) => o.id} onRow={(o) => openOrder(o.id, o.number)} empty="مفيش أوردرات مستنية تأكيد" rowTone={(o) => (o.hours > p.limitHours ? 'bad' : undefined)}
            cols={[{ label: 'رقم', cell: (o) => o.number }, { label: 'مستني', cell: (o) => <span className={o.hours > p.limitHours ? 'text-[#ff8a8e]' : ''}>{o.hours > p.limitHours && '⚠ '}{ago(o.created_at)}</span> }, { label: 'العميل', cell: (o) => o.name, main: true }, { label: 'الإجمالي', cell: (o) => egp(o.total) }]} />
        )) : undefined}>
        {p ? (
          <>
            <Big tone={p.overdue ? 'bad' : p.count ? 'warn' : 'good'}>{num(p.count)} <span className="text-base font-normal">أوردر جديد</span></Big>
            {p.overdue > 0 ? <div className="mt-2"><Warn>{num(p.overdue)} منهم مستني أكتر من {num(p.limitHours)} ساعة</Warn></div> : <p className="mt-2 text-[12px] text-muted">{p.count ? `كله أقل من ${num(p.limitHours)} ساعة` : 'كله متأكد ✓'}</p>}
          </>
        ) : <Waiting failed={pending.stale} />}
      </Card>

      <Card title="الشهر ده" stale={month.stale} className="md:col-span-2"
        onOpen={m ? () => open('مبيعات الشهر ده يوم بيوم', (
          <>
            <dl><Row k="مبيعات الشهر" v={egp(m.sales)} /><Row k="عدد الأوردرات" v={num(m.orders)} /><Row k="التارجت" v={egp(m.target)} /><Row k="فاضل للتارجت" v={egp(Math.max(0, m.target - m.sales))} /></dl>
            <h3 className="mb-2 mt-5 text-[13px] text-muted">يوم بيوم</h3>
            <DataList rows={m.days} rowKey={(d) => d.day} cols={[{ label: 'اليوم', cell: (d) => isoDayLabel(d.day) }, { label: 'المبيعات', cell: (d) => egp(d.sales) }, { label: 'الأوردرات', cell: (d) => num(d.n) }]} />
          </>
        )) : undefined}>
        {m ? (
          <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-end">
            <div><Big>{egp(m.sales)}</Big><p className="mt-1 text-[13px] text-muted">{num(m.orders)} أوردر</p></div>
            <Progress value={m.sales} max={m.target} label="التقدم ناحية تارجت الشهر" />
          </div>
        ) : <Waiting failed={month.stale} />}
      </Card>

      <Card title="صافي الربح الشهر ده" stale={profit.stale} className="md:col-span-2 xl:col-span-1" onOpen={profit.data ? () => open('صافي الربح الشهر ده', <ProfitBreakdown p={profit.data!} />) : undefined}>
        {profit.data ? (
          <>
            <Big tone={profit.data.net >= 0 ? 'good' : 'bad'}>{profit.data.net < 0 ? '−' : ''}{egp(Math.abs(profit.data.net))}</Big>
            <p className="mt-2 text-[12px] text-muted">المبيعات المتسلمة − تكلفة البضاعة − الشحن − المصاريف</p>
          </>
        ) : <Waiting failed={profit.stale} />}
      </Card>

      <Card title="المبيعات آخر ٣٠ يوم" stale={chart.stale} className="md:col-span-2 xl:col-span-4"
        onOpen={chart.data ? () => open('المبيعات آخر ٣٠ يوم', (
          <DataList rows={[...chart.data!].reverse()} rowKey={(d) => d.day} cols={[{ label: 'اليوم', cell: (d) => isoDayLabel(d.day) }, { label: 'المبيعات', cell: (d) => egp(d.sales) }, { label: 'الأوردرات', cell: (d) => num(d.n) }]} />
        )) : undefined}>
        {chart.data ? (
          <>
            <BarChart data={chart.data} />
            <p className="mt-2 text-[12px] text-muted">الإجمالي: {egp(chart.data.reduce((a, d) => a + d.sales, 0))} · {num(chart.data.reduce((a, d) => a + d.n, 0))} أوردر · دوس على أي عمود تشوف اليوم</p>
          </>
        ) : <Waiting failed={chart.stale} />}
      </Card>
    </div>
  );
}
