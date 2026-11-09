import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCategories } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { ShopView, type SearchParams } from '@/components/shop/ShopView';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: Locale; category: string }>; searchParams: Promise<SearchParams> };
const find = async (slug: string) => (await getCategories()).find((c) => c.slug === slug);

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, category } = await params;
  const c = await find(category);
  if (!c) return {};
  return { title: locale === 'ar' ? c.nameAr : c.nameEn, description: locale === 'ar' ? c.blurbAr : c.blurbEn, alternates: { canonical: `/${locale}/shop/${c.slug}`, languages: { ar: `/ar/shop/${c.slug}`, en: `/en/shop/${c.slug}` } } };
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { locale, category } = await params;
  const c = await find(category);
  // A removed or unknown category goes to the shop instead of a 404.
  if (!c) redirect(`/${locale}/shop`);
  return <ShopView locale={locale} sp={await searchParams} title={locale === 'ar' ? c.nameAr : c.nameEn} blurb={locale === 'ar' ? c.blurbAr : c.blurbEn} image={c.image} base={{ category: c.slug }} />;
}
