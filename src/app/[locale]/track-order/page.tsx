import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { TrackForm } from '@/components/account/TrackForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.track.title, description: t.track.intro, alternates: { canonical: `/${locale}/track-order`, languages: { ar: '/ar/track-order', en: '/en/track-order' } } };
}

export default async function TrackPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return (
    <div className="container-zx mx-auto min-h-[60vh] max-w-[680px] py-12 md:py-20">
      <h1 className="display text-[clamp(1.9rem,4.2vw,3.2rem)]">{t.track.title}</h1>
      <p className="mt-3 text-muted">{t.track.intro}</p>
      <Suspense><TrackForm /></Suspense>
    </div>
  );
}
