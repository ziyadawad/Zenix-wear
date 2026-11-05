import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getContent } from '@/lib/catalog';
import { CATEGORIES, type Category, type Locale } from '@/lib/types';
import { ShopView, type SearchParams } from '@/components/shop/ShopView';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: Locale; category: string }>; searchParams: Promise<SearchParams> };
const valid = (c: string): c is Category => (CATEGORIES as readonly string[]).includes(c);

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, category } = await params;
  if (!valid(category)) return {};
  const t = getDictionary(locale);
  return { title: t.categories[category], description: t.categoryBlurb[category], alternates: { canonical: `/${locale}/shop/${category}`, languages: { ar: `/ar/shop/${category}`, en: `/en/shop/${category}` } } };
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { locale, category } = await params;
  if (!valid(category)) notFound();
  const t = getDictionary(locale);
  const content = await getContent();
  return <ShopView locale={locale} sp={await searchParams} title={t.categories[category]} blurb={t.categoryBlurb[category]} image={content.categoryImages[category]} base={{ category }} />;
}
