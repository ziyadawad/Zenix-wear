'use client';
import { useEffect, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { SlidersHorizontal, X } from 'lucide-react';
import { useI18n } from '../layout/I18nProvider';
import { cx, toLatinDigits } from '@/lib/utils';

export interface Facets {
  colors: { id: string; nameAr: string; nameEn: string; hex: string }[];
  sizes: string[]; fits: string[]; flags: string[]; minPrice: number; maxPrice: number;
}

function useParamsEditor() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();
  const push = (next: URLSearchParams) => {
    next.delete('page');
    const qs = next.toString();
    start(() => router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  };
  const list = (k: string) => sp.get(k)?.split(',').filter(Boolean) ?? [];
  const toggle = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    const cur = list(k);
    const val = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
    if (val.length) next.set(k, val.join(',')); else next.delete(k);
    push(next);
  };
  const setOne = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v); else next.delete(k);
    push(next);
  };
  const setMany = (values: Record<string, string>) => {
    const next = new URLSearchParams(sp.toString());
    let changed = false;
    for (const [k, v] of Object.entries(values)) {
      if ((sp.get(k) ?? '') !== v) changed = true;
      if (v) next.set(k, v); else next.delete(k);
    }
    if (changed) push(next);
  };
  return { sp, list, toggle, setOne, setMany, pending, clear: () => push(new URLSearchParams()) };
}

export function SortSelect() {
  const { t } = useI18n();
  const { sp, setOne } = useParamsEditor();
  return (
    <label className="flex items-center gap-2 text-[13px] text-muted">
      <span className="hidden sm:inline">{t.shop.sort}</span>
      <select aria-label={t.shop.sort} value={sp.get('sort') ?? 'best'} onChange={(e) => setOne('sort', e.target.value === 'best' ? '' : e.target.value)} className="h-11 max-w-[170px] border border-line bg-ink px-2 text-[13px] text-white">
        <option value="best">{t.shop.sortBest}</option>
        <option value="newest">{t.shop.sortNew}</option>
        <option value="price-asc">{t.shop.sortAsc}</option>
        <option value="price-desc">{t.shop.sortDesc}</option>
      </select>
    </label>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-line py-5">
      <legend className="eyebrow float-start mb-4 w-full">{title}</legend>
      <div className="clear-both">{children}</div>
    </fieldset>
  );
}

function FilterBody({ facets }: { facets: Facets }) {
  const { t, locale } = useI18n();
  const { sp, list, toggle, setMany } = useParamsEditor();
  const [min, setMin] = useState(sp.get('min') ?? '');
  const [max, setMax] = useState(sp.get('max') ?? '');
  useEffect(() => { setMin(sp.get('min') ?? ''); setMax(sp.get('max') ?? ''); }, [sp]);

  const check = (k: string, v: string, label: string) => {
    const on = list(k).includes(v);
    return (
      <label key={v} className="flex min-h-10 cursor-pointer items-center gap-3 text-sm">
        <input type="checkbox" checked={on} onChange={() => toggle(k, v)} className="peer sr-only" />
        <span className={cx('flex size-[18px] flex-none items-center justify-center border peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-white', on ? 'border-white bg-white' : 'border-line-strong')}>
          {on && <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="#000" strokeWidth="1.5" aria-hidden="true"><path d="M1.500 5l2.500 2.500 4.500-5" /></svg>}
        </span>
        {label}
      </label>
    );
  };

  const sizes = facets.sizes.filter((s) => s !== 'ONE');
  const commitPrice = () => {
    const clean = (v: string) => toLatinDigits(v).replace(/\D/g, '');
    setMany({ min: clean(min), max: clean(max) });
  };

  return (
    <div>
      {facets.flags.length > 0 && (
        <Group title={t.shop.availability}>
          {facets.flags.includes('new') && check('flags', 'new', t.shop.flagNew)}
          {facets.flags.includes('best') && check('flags', 'best', t.shop.flagBest)}
          {facets.flags.includes('sale') && check('flags', 'sale', t.shop.flagSale)}
          {facets.flags.includes('in-stock') && check('flags', 'in-stock', t.shop.flagInStock)}
        </Group>
      )}
      {facets.fits.length > 1 && (
        <Group title={t.shop.fit}>
          {facets.fits.includes('regular') && check('fit', 'regular', t.fits.regular)}
          {facets.fits.includes('compression') && check('fit', 'compression', t.fits.compression)}
        </Group>
      )}
      {sizes.length > 0 && (
        <Group title={t.shop.size}>
          <div className="flex flex-wrap gap-1.5" dir="ltr">
            {sizes.map((s) => {
              const on = list('size').includes(s);
              return <button key={s} type="button" aria-pressed={on} onClick={() => toggle('size', s)} className={cx('h-11 min-w-11 border px-2 text-xs transition-colors', on ? 'border-white bg-white text-black' : 'border-line-strong hover:border-white')}>{s}</button>;
            })}
          </div>
        </Group>
      )}
      {facets.colors.length > 1 && <Group title={t.shop.color}>
        <div className="flex flex-wrap gap-1">
          {facets.colors.map((c) => {
            const on = list('color').includes(c.id);
            const name = locale === 'ar' ? c.nameAr : c.nameEn;
            return (
              <button key={c.id} type="button" aria-pressed={on} aria-label={name} title={name} onClick={() => toggle('color', c.id)} className="flex size-11 items-center justify-center">
                <span className={cx('size-6 rounded-full border', on ? 'border-white ring-1 ring-white ring-offset-2 ring-offset-ink' : 'border-line-strong')} style={{ background: c.hex }} />
              </button>
            );
          })}
        </div>
      </Group>}
      {facets.maxPrice > facets.minPrice && <Group title={t.shop.price}>
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); commitPrice(); }}>
          <input inputMode="numeric" aria-label={t.shop.from} placeholder={String(facets.minPrice)} value={min} onChange={(e) => setMin(e.target.value)} onBlur={commitPrice} className="field !min-h-11 !py-1" dir="ltr" />
          <span className="text-muted">–</span>
          <input inputMode="numeric" aria-label={t.shop.to} placeholder={String(facets.maxPrice)} value={max} onChange={(e) => setMax(e.target.value)} onBlur={commitPrice} className="field !min-h-11 !py-1" dir="ltr" />
          <button type="submit" className="sr-only">OK</button>
        </form>
      </Group>}
    </div>
  );
}

const FILTER_KEYS = ['size', 'color', 'fit', 'min', 'max', 'flags'];

export function FilterSidebar({ facets }: { facets: Facets }) {
  const { t } = useI18n();
  const { sp, clear } = useParamsEditor();
  const active = FILTER_KEYS.some((k) => sp.has(k));
  return (
    <aside className="sticky top-[calc(var(--hh)+16px)] hidden max-h-[calc(100svh-var(--hh)-32px)] overflow-y-auto pe-4 no-scrollbar lg:block" aria-label={t.shop.filters}>
      <div className="flex h-11 items-center justify-between">
        <h2 className="eyebrow">{t.shop.filters}</h2>
        {active && <button className="text-xs text-muted underline underline-offset-4" onClick={clear}>{t.shop.clear}</button>}
      </div>
      <FilterBody facets={facets} />
    </aside>
  );
}

export function FilterSheet({ facets, count }: { facets: Facets; count: number }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { sp, clear } = useParamsEditor();
  const n = FILTER_KEYS.filter((k) => sp.has(k)).length;
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);
  return (
    <>
      <button className="flex h-11 items-center gap-2 border border-line px-4 text-[13px] lg:hidden" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <SlidersHorizontal size={15} strokeWidth={1.25} />{t.shop.filters}{n > 0 && <span className="flex size-[18px] items-center justify-center rounded-full bg-white text-[10px] text-black">{n}</span>}
      </button>
      {open && (
        <>
          <div className="scrim" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="sheet" role="dialog" aria-modal="true" aria-label={t.shop.filters}>
            <div className="flex flex-none items-center justify-between border-b border-line px-4 py-2">
              <h2 className="eyebrow">{t.shop.filters}</h2>
              <button className="icon-btn -me-3" aria-label={t.nav.close} onClick={() => setOpen(false)} autoFocus><X size={22} strokeWidth={1.25} /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4"><FilterBody facets={facets} /></div>
            <div className="flex flex-none gap-2 border-t border-line p-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
              <button className="btn btn-ghost !px-4" onClick={clear}>{t.shop.clear}</button>
              <button className="btn btn-primary flex-1" onClick={() => setOpen(false)}>{t.shop.apply} ({count})</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
