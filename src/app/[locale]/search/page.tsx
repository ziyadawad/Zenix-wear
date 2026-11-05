import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cardProps, filterProducts, getCatalog } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { ProductGrid } from '@/components/shop/ProductGrid';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Search', robots: { index: false } };

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ q?: string }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const q = String((await searchParams).q ?? '').slice(0, 60);
  const list = filterProducts(await getCatalog(), { q });
  return (
    <div className="container-zx min-h-[60vh] py-10 md:py-16">
      <h1 className="display text-[clamp(1.5rem,3.4vw,2.6rem)]">{list.length ? `${list.length} ${t.search.results} “${q}”` : `${t.search.none} “${q}”`}</h1>
      <h2 className="sr-only">{t.search.title}</h2>
      <div className="mt-8">{list.length > 0 && <ProductGrid products={list.map(cardProps)} />}</div>
    </div>
  );
}
