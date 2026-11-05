import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCollections } from '@/lib/catalog';
import type { Locale } from '@/lib/types';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: getDictionary(locale).nav.collections, alternates: { canonical: `/${locale}/collections`, languages: { ar: '/ar/collections', en: '/en/collections' } } };
}

export default async function Collections({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const collections = await getCollections();
  return (
    <>
      <h1 className="display container-zx pb-8 pt-12 text-[clamp(2rem,5vw,4.2rem)] md:pt-20">{t.nav.collections}</h1>
      <div className="grid gap-px bg-line md:grid-cols-3">
        {collections.map((c, i) => (
          <Link key={c.slug} href={`/${locale}/collections/${c.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-black md:aspect-[3/4.4]">
            <Image src={c.image} alt="" fill preload={i === 0} fetchPriority={i === 0 ? 'high' : 'auto'} loading={i === 0 ? 'eager' : 'lazy'} sizes="(min-width:768px) 33vw, 100vw" quality={70} className="zoom-img object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 md:p-8">
              <h2 className="display text-2xl md:text-3xl">{locale === 'ar' ? c.nameAr : c.nameEn}</h2>
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-silver">{locale === 'ar' ? c.storyAr : c.storyEn}</p>
              <span className="link-underline mt-5 inline-block text-[13px]">{t.home.discover}</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
