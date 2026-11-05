import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { ShopView, type SearchParams } from '@/components/shop/ShopView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.nav.newDrops, description: t.categoryBlurb.new, alternates: { canonical: `/${locale}/new-drops`, languages: { ar: '/ar/new-drops', en: '/en/new-drops' } } };
}

export default async function NewDrops({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<SearchParams> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return <ShopView locale={locale} sp={await searchParams} title={t.nav.newDrops} blurb={t.categoryBlurb.new} image="/images/editorial/deadlift.webp" base={{ flags: ['new'], sort: 'newest' }} showSubnav={false} />;
}
