import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCollections } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { ShopView, type SearchParams } from '@/components/shop/ShopView';

export const dynamic = 'force-dynamic';

type P = { params: Promise<{ locale: Locale; slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const c = (await getCollections()).find((x) => x.slug === slug);
  if (!c) return {};
  return { title: locale === 'ar' ? c.nameAr : c.nameEn, description: locale === 'ar' ? c.storyAr : c.storyEn, alternates: { canonical: `/${locale}/collections/${slug}`, languages: { ar: `/ar/collections/${slug}`, en: `/en/collections/${slug}` } } };
}

export default async function CollectionPage({ params, searchParams }: P) {
  const { locale, slug } = await params;
  const c = (await getCollections()).find((x) => x.slug === slug);
  if (!c) notFound();
  return <ShopView locale={locale} sp={await searchParams} title={locale === 'ar' ? c.nameAr : c.nameEn} blurb={locale === 'ar' ? c.storyAr : c.storyEn} image={c.image} base={{ collection: slug }} showSubnav={false} />;
}
