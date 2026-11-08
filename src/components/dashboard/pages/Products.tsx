'use client';
import { usePage } from '../data';
import { useShell } from '../App';
import { Card, DataList, RankBars, Waiting, egp, num, pct, toneText } from '../ui';

type Sold = { id: string; name: string; pieces: number; money: number; stock?: number };
type Count = { label: string; pieces: number };
type Ret = { id: string; name: string; returned: number | null; closed: number | null };
type Promo = { code: string; active: boolean; type: string; value: number; uses: number; discount: number; uses_month: number };

export function ProductsPage() {
  const { sec } = usePage('products');
  const { open } = useShell();
  const best = sec<Sold[]>('best'), slow = sec<Sold[]>('slow'), sizes = sec<Count[]>('sizes'), colors = sec<Count[]>('colors'), returns = sec<Ret[]>('returns'), promos = sec<Promo[]>('promos');
  const table = (title: string, rows: Sold[]) => () => open(title, (
    <DataList rows={rows} rowKey={(r) => r.id} cols={[{ label: 'المنتج', cell: (r) => r.name, main: true }, { label: 'قطع', cell: (r) => num(r.pieces) }, { label: 'فلوس', cell: (r) => egp(r.money) }, ...(rows[0]?.stock != null ? [{ label: 'في المخزن', cell: (r: Sold) => num(r.stock ?? 0) }] : [])]} />
  ));
  const counts = (title: string, rows: Count[]) => () => open(title, <RankBars rows={rows.map((r) => ({ key: r.label, label: r.label, value: r.pieces, text: `${num(r.pieces)} قطعة` }))} />);
  const rate = (r: Ret) => (r.closed ? (r.returned ?? 0) / r.closed : 0);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Card title="الأكتر مبيعًا الشهر ده" stale={best.stale} onOpen={best.data ? table('الأكتر مبيعًا الشهر ده', best.data) : undefined}>
        {best.data ? <RankBars rows={best.data.map((r) => ({ key: r.id, label: r.name, value: r.pieces, text: `${num(r.pieces)} قطعة · ${egp(r.money)}` }))} empty="مفيش مبيعات الشهر ده لسه" /> : <Waiting failed={best.stale} />}
      </Card>
      <Card title="الأبطأ في البيع الشهر ده" stale={slow.stale} onOpen={slow.data ? table('الأبطأ في البيع الشهر ده', slow.data) : undefined}>
        {slow.data ? (
          <ul className="space-y-2 text-sm">
            {slow.data.map((r) => <li key={r.id} className="flex justify-between gap-3"><span className="min-w-0 truncate">{r.name}</span><span className={`flex-none ${r.pieces ? 'text-silver' : toneText.bad}`}>{r.pieces ? `${num(r.pieces)} قطعة` : 'ولا قطعة'} <span className="text-muted">· في المخزن {num(r.stock ?? 0)}</span></span></li>)}
          </ul>
        ) : <Waiting failed={slow.stale} />}
      </Card>
      <Card title="أكتر المقاسات اتباعت (الشهر ده)" stale={sizes.stale} onOpen={sizes.data ? counts('المقاسات الشهر ده', sizes.data) : undefined}>
        {sizes.data ? <RankBars rows={sizes.data.map((r) => ({ key: r.label, label: r.label === 'ONE' ? 'مقاس واحد' : r.label, value: r.pieces, text: `${num(r.pieces)} قطعة` }))} /> : <Waiting failed={sizes.stale} />}
      </Card>
      <Card title="أكتر الألوان اتباعت (الشهر ده)" stale={colors.stale} onOpen={colors.data ? counts('الألوان الشهر ده', colors.data) : undefined}>
        {colors.data ? <RankBars rows={colors.data.map((r) => ({ key: r.label, label: r.label, value: r.pieces, text: `${num(r.pieces)} قطعة` }))} /> : <Waiting failed={colors.stale} />}
      </Card>
      <Card title="نسبة المرتجع لكل منتج" stale={returns.stale}
        onOpen={returns.data ? () => open('نسبة المرتجع لكل منتج', (
          <DataList rows={returns.data!} rowKey={(r) => r.id} rowTone={(r) => (rate(r) >= 0.15 ? 'bad' : undefined)}
            cols={[{ label: 'المنتج', cell: (r) => r.name, main: true }, { label: 'رجع', cell: (r) => num(r.returned ?? 0) }, { label: 'من', cell: (r) => num(r.closed ?? 0) }, { label: 'النسبة', cell: (r) => pct(rate(r)) }]} />
        )) : undefined}>
        {returns.data ? (
          <RankBars rows={returns.data.filter((r) => r.returned).slice(0, 8).map((r) => ({ key: r.id, label: r.name, value: rate(r), text: `${pct(rate(r))} (${num(r.returned ?? 0)} من ${num(r.closed ?? 0)})`, tone: rate(r) >= 0.15 ? 'bad' as const : undefined }))} empty="✓ مفيش مرتجعات" />
        ) : <Waiting failed={returns.stale} />}
      </Card>
      <Card title="أكواد الخصم" stale={promos.stale}>
        {promos.data ? (
          <DataList rows={promos.data} rowKey={(p) => p.code} empty="مفيش أكواد خصم"
            cols={[
              { label: 'الكود', cell: (p) => <span dir="ltr" className={p.active ? '' : 'text-muted line-through'}>{p.code}</span> },
              { label: 'الخصم', cell: (p) => (p.type === 'percent' ? `${num(p.value)}٪` : egp(p.value)) },
              { label: 'اتستخدم', cell: (p) => `${num(p.uses)} مرة (${num(p.uses_month)} الشهر ده)` },
              { label: 'خصم اتدفع', cell: (p) => egp(p.discount) },
            ]} />
        ) : <Waiting failed={promos.stale} />}
      </Card>
    </div>
  );
}
