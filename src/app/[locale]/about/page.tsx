import type { Metadata } from 'next';
import Image from 'next/image';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { SCENES } from '@/lib/db/images';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.nav.about, description: t.about.intro, alternates: { canonical: `/${locale}/about`, languages: { ar: '/ar/about', en: '/en/about' } } };
}

/** Short and to the point: the brand, the fabric, the fit. */
export default async function About({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale).about;
  return (
    <>
      <section className="relative flex min-h-[64svh] items-end overflow-hidden bg-black">
        <div className="brand-texture absolute inset-0" aria-hidden="true" />
        <Image src={SCENES.all} alt="" fill preload fetchPriority="high" loading="eager" sizes="100vw" quality={75} className="object-cover object-[50%_30%] opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />
        <div className="container-zx relative pb-12 md:pb-20">
          <p className="eyebrow mb-5">{t.eyebrow}</p>
          <h1 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,5.4rem)]">{t.title}</h1>
          <p className="mt-6 max-w-[56ch] leading-[1.9] text-silver">{t.intro}</p>
        </div>
      </section>
      <section className="container-zx section mx-auto grid max-w-[1200px] gap-10 md:grid-cols-2 md:gap-16">
        {[[t.qualityTitle, t.quality], [t.fitTitle, t.fit]].map(([h, p]) => (
          <div key={h} className="glow-divider-top pt-8" data-reveal>
            <h2 className="display h-section">{h}</h2>
            <p className="mt-5 text-[17px] leading-[2] text-[#d0d0d0]">{p}</p>
          </div>
        ))}
      </section>
      <section className="container-zx mx-auto max-w-[1200px] pb-20 md:pb-28">
        <h2 className="display h-section mb-10" data-reveal>{t.valuesTitle}</h2>
        <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
          {t.values.map(([h, p]) => (
            <li key={h} className="bg-ink p-7" data-reveal><h3 className="font-medium">{h}</h3><p className="mt-3 text-sm leading-[1.9] text-muted">{p}</p></li>
          ))}
        </ul>
      </section>
    </>
  );
}
