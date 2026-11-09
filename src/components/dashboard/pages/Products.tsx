'use client';
import { CheckCircle2, Palette, Ruler, TicketPercent, TrendingDown, TrendingUp, Undo2 } from 'lucide-react';
import { usePage } from '../data';
import { useShell } from '../App';
import { L } from '../i18n';
import { Card, DataList, RankBars, Waiting, egp, num, pct, pieces, sizeLabel, toneText } from '../ui';

type Sold = { id: string; name: string; pieces: number; money: number; stock?: number };
type Count = { label: string; pieces: number };
type Ret = { id: string; name: string; returned: number | null; closed: number | null };
type Promo = { code: string; active: boolean; type: string; value: number; uses: number; discount: number; uses_month: number };

export function ProductsPage() {
  const { sec } = usePage('products');
  const { open } = useShell();
  const best = sec<Sold[]>('best'), slow = sec<Sold[]>('slow'), sizes = sec<Count[]>('sizes'), colors = sec<Count[]>('colors'), returns = sec<Ret[]>('returns'), promos = sec<Promo[]>('promos');
  const noSales = L('لسه مفيش مبيعات الشهر ده', 'No sales this month yet');
  const table = (title: string, rows: Sold[]) => () => open(title, (
    <DataList rows={rows} rowKey={(r) => r.id} cols={[{ label: L('المنتج', 'Product'), cell: (r) => r.name, main: true }, { label: L('قطع', 'Pieces'), cell: (r) => num(r.pieces) }, { label: L('فلوس', 'Revenue'), cell: (r) => egp(r.money) }, ...(rows[0]?.stock != null ? [{ label: L('في المخزن', 'In stock'), cell: (r: Sold) => num(r.stock ?? 0) }] : [])]} />
  ));
  const counts = (title: string, rows: Count[], label: (s: string) => string = (s) => s) => () => open(title, <RankBars rows={rows.map((r) => ({ key: r.label, label: label(r.label), value: r.pieces, text: pieces(r.pieces) }))} empty={noSales} />);
  const rate = (r: Ret) => (r.closed ? (r.returned ?? 0) / r.closed : 0);
  const bestTitle = L('الأكتر مبيعًا الشهر ده', 'Best sellers this month');
  const slowTitle = L('الأبطأ في البيع الشهر ده', 'Slowest sellers this month');

  return (
    <div className="grid gap-3 md:gap-4 lg:grid-cols-2">
      <Card title={bestTitle} icon={TrendingUp} stale={best.stale} onOpen={best.data?.length ? table(bestTitle, best.data) : undefined}>
        {best.data ? <RankBars rows={best.data.map((r) => ({ key: r.id, label: r.name, value: r.pieces, text: `${pieces(r.pieces)} · ${egp(r.money)}` }))} empty={noSales} /> : <Waiting failed={best.stale} />}
      </Card>
      <Card title={slowTitle} icon={TrendingDown} stale={slow.stale} onOpen={slow.data?.length ? table(slowTitle, slow.data) : undefined}>
        {slow.data ? (
          <RankBars rows={slow.data.map((r) => ({ key: r.id, label: r.name, value: r.pieces, text: `${r.pieces ? pieces(r.pieces) : L('ولا قطعة', 'none sold')} · ${L('في المخزن', 'in stock')} ${num(r.stock ?? 0)}`, tone: r.pieces ? undefined : 'bad' as const }))} empty={L('لسه مفيش منتجات', 'No products yet')} />
        ) : <Waiting failed={slow.stale} />}
      </Card>
      <Card title={L('أكتر المقاسات بيعًا', 'Top sizes')} icon={Ruler} stale={sizes.stale} onOpen={sizes.data?.length ? counts(L('المقاسات الشهر ده', 'Sizes this month'), sizes.data, sizeLabel) : undefined}>
        {sizes.data ? <RankBars rows={sizes.data.map((r) => ({ key: r.label, label: sizeLabel(r.label), value: r.pieces, text: pieces(r.pieces) }))} empty={noSales} /> : <Waiting failed={sizes.stale} />}
      </Card>
      <Card title={L('أكتر الألوان بيعًا', 'Top colours')} icon={Palette} stale={colors.stale} onOpen={colors.data?.length ? counts(L('الألوان الشهر ده', 'Colours this month'), colors.data) : undefined}>
        {colors.data ? <RankBars rows={colors.data.map((r) => ({ key: r.label, label: r.label, value: r.pieces, text: pieces(r.pieces) }))} empty={noSales} /> : <Waiting failed={colors.stale} />}
      </Card>
      <Card title={L('نسبة المرتجع لكل منتج', 'Return rate per product')} icon={Undo2} stale={returns.stale}
        onOpen={returns.data?.length ? () => open(L('نسبة المرتجع لكل منتج', 'Return rate per product'), (
          <DataList rows={returns.data!} rowKey={(r) => r.id} rowTone={(r) => (rate(r) >= 0.15 ? 'bad' : undefined)}
            cols={[{ label: L('المنتج', 'Product'), cell: (r) => r.name, main: true }, { label: L('رجع', 'Returned'), cell: (r) => num(r.returned ?? 0) }, { label: L('من', 'Of'), cell: (r) => num(r.closed ?? 0) }, { label: L('النسبة', 'Rate'), cell: (r) => pct(rate(r)) }]} />
        )) : undefined}>
        {returns.data ? (
          returns.data.some((r) => r.returned)
            ? <RankBars rows={returns.data.filter((r) => r.returned).slice(0, 8).map((r) => ({ key: r.id, label: r.name, value: rate(r), text: `${pct(rate(r))} (${L(`${num(r.returned ?? 0)} من ${num(r.closed ?? 0)}`, `${num(r.returned ?? 0)} of ${num(r.closed ?? 0)}`)})`, tone: rate(r) >= 0.15 ? 'bad' as const : undefined }))} />
            : <p className={`flex items-center gap-2 py-6 text-sm ${toneText.good}`}><CheckCircle2 size={18} aria-hidden="true" />{L('مفيش مرتجعات', 'No returns')}</p>
        ) : <Waiting failed={returns.stale} />}
      </Card>
      <Card title={L('أكواد الخصم', 'Promo codes')} icon={TicketPercent} stale={promos.stale}>
        {promos.data ? (
          <DataList rows={promos.data} rowKey={(p) => p.code} empty={L('مفيش أكواد خصم', 'No promo codes')}
            cols={[
              { label: L('الكود', 'Code'), cell: (p) => <span dir="ltr" className={p.active ? '' : 'text-muted line-through'}>{p.code}</span> },
              { label: L('الخصم', 'Discount'), cell: (p) => (p.type === 'percent' ? pct(p.value / 100) : egp(p.value)) },
              { label: L('اتستخدم', 'Used'), cell: (p) => L(`${num(p.uses)} مرة (${num(p.uses_month)} الشهر ده)`, `${num(p.uses)}× (${num(p.uses_month)} this month)`) },
              { label: L('خصم اتدفع', 'Given away'), cell: (p) => egp(p.discount) },
            ]} />
        ) : <Waiting failed={promos.stale} />}
      </Card>
    </div>
  );
}
