import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { cardProps, facets, filterProducts, getCatalog, parseList, type ShopQuery } from '@/lib/catalog';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { FITS, type Locale } from '@/lib/types';
import { FilterSheet, FilterSidebar, SortSelect } from './Filters';
import { ProductGrid } from './ProductGrid';

export type SearchParams = Record<string, string | string[] | undefined>;

export function queryFromParams(sp: SearchParams): ShopQuery {
  const num = (v: string | string[] | undefined) => (typeof v === 'string' && /^\d+$/.test(v) ? Number(v) : undefined);
  return {
    size: parseList(sp.size), color: parseList(sp.color), fit: parseList(sp.fit).filter((f) => (FITS as readonly string[]).includes(f)), flags: parseList(sp.flags),
    min: num(sp.min), max: num(sp.max), sort: typeof sp.sort === 'string' ? sp.sort : undefined,
  };
}

export async function ShopView({ locale, sp, title, blurb, image, base, showSubnav = true }: {
  locale: Locale; sp: SearchParams; title: string; blurb?: string; image?: string; base: ShopQuery; showSubnav?: boolean;
}) {
  const t = getDictionary(locale);
  const all = await getCatalog();
  const scope = filterProducts(all, base);
  const list = filterProducts(all, { ...base, ...queryFromParams(sp), flags: [...(base.flags ?? []), ...parseList(sp.flags)] });
  const f = facets(scope);
  const lp = (p: string) => `/${locale}${p}`;

  return (
    <>
      <section className="relative flex h-[34vh] min-h-[230px] items-end overflow-hidden bg-black md:h-[46vh]">
        {image && <Image src={image} alt="" fill preload fetchPriority="high" loading="eager" sizes="100vw" quality={70} className="object-cover opacity-65" />}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-black/40" />
        <div className="container-zx relative pb-6 md:pb-10">
          <h1 className="display text-[clamp(2rem,5vw,4.2rem)]">{title}</h1>
          {blurb && <p className="mt-2 max-w-[60ch] text-sm text-silver">{blurb}</p>}
        </div>
      </section>
      {showSubnav && (
        <nav aria-label={t.nav.shop} className="border-b border-line">
          <ul className="container-zx flex gap-6 overflow-x-auto whitespace-nowrap no-scrollbar">
            {[{ h: '/shop', l: locale === 'ar' ? 'الكل' : 'All' }, ...(['t-shirts', 'tanks', 'shorts', 'socks', 'accessories'] as const).map((c) => ({ h: `/shop/${c}`, l: t.categories[c] }))].map((x) => {
              const active = base.category ? x.h === `/shop/${base.category}` : x.h === '/shop';
              return (
                <li key={x.h}><Link href={lp(x.h)} aria-current={active ? 'page' : undefined} className={`block min-w-8 border-b py-4 text-center text-[13px] ${active ? 'border-white' : 'border-transparent text-muted hover:text-white'}`}>{x.l}</Link></li>
              );
            })}
          </ul>
        </nav>
      )}
      <div className="container-zx grid gap-8 py-5 pb-16 md:py-8 lg:grid-cols-[250px_1fr] xl:gap-12">
        <Suspense><FilterSidebar facets={f} /></Suspense>
        <div className="min-w-0">
          <div className="mb-5 flex items-center justify-between gap-3">
            <Suspense><FilterSheet facets={f} count={list.length} /></Suspense>
            <p className="hidden text-[13px] text-muted lg:block" aria-live="polite">{list.length} {t.shop.results}</p>
            <Suspense><SortSelect /></Suspense>
          </div>
          <h2 className="sr-only">{title}</h2>
          <p className="mb-4 text-[13px] text-muted lg:hidden" aria-live="polite">{list.length} {t.shop.results}</p>
          {list.length === 0 ? (
            <div className="border border-line py-24 text-center">
              <p className="text-muted">{t.shop.noResults}</p>
              <Link href={lp(base.category ? `/shop/${base.category}` : '/shop')} className="btn btn-ghost mt-6">{t.shop.clear}</Link>
            </div>
          ) : (
            <ProductGrid key={JSON.stringify(list.map((p) => p.id).slice(0, 8))} products={list.map(cardProps)} />
          )}
        </div>
      </div>
    </>
  );
}
