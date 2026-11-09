import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getContent } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { ShopView, type SearchParams } from '@/components/shop/ShopView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.nav.shop, description: t.categoryBlurb.shop, alternates: { canonical: `/${locale}/shop`, languages: { ar: '/ar/shop', en: '/en/shop' } } };
}

export default async function Shop({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const content = await getContent();
  return <ShopView locale={locale} sp={await searchParams} title={t.nav.shop} blurb={t.categoryBlurb.shop} image={content.shopImage} base={{}} />;
}
