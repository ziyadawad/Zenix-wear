import type { Metadata } from 'next';
import Image from 'next/image';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { OrbitMark } from '@/components/home/Bits';
import { SCENES } from '@/lib/db/images';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(locale);
  return { title: t.nav.about, description: t.about.intro, alternates: { canonical: `/${locale}/about`, languages: { ar: '/ar/about', en: '/en/about' } } };
}

export default async function About({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale).about;
  return (
    <>
      <section className="relative flex min-h-[72svh] items-end overflow-hidden bg-black">
        <div className="brand-texture absolute inset-0" aria-hidden="true" />
        <Image src={SCENES.all} alt="" fill preload fetchPriority="high" loading="eager" sizes="100vw" quality={75} className="object-cover object-[50%_30%] opacity-55" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/25" />
        <div className="container-zx relative pb-12 md:pb-20">
          <p className="eyebrow mb-5">{t.eyebrow}</p>
          <h1 className="display max-w-[16ch] text-[clamp(2.2rem,6vw,5.4rem)]">{t.title}</h1>
          <p className="mt-6 max-w-[56ch] leading-[1.9] text-silver">{t.intro}</p>
        </div>
      </section>
      <section className="container-zx section mx-auto grid max-w-[1200px] gap-12 md:grid-cols-[1fr_1.4fr] md:gap-20">
        <h2 className="display h-section" data-reveal>{t.storyTitle}</h2>
        <p className="text-[17px] leading-[2] text-[#d0d0d0]" data-reveal>{t.story}</p>
      </section>
      <section className="border-y border-line bg-black">
        <div className="container-zx section mx-auto grid max-w-[1200px] items-center gap-14 md:grid-cols-2">
          <div className="mx-auto w-[min(70vw,400px)]" data-reveal><OrbitMark /></div>
          <div data-reveal>
            <h2 className="display h-section">{t.meaningTitle}</h2>
            <p className="mt-6 leading-[2] text-[#d0d0d0]">{t.meaning}</p>
            <p className="mt-6 text-3xl font-light" lang="ar" dir="rtl">سَمْت الرأس</p>
          </div>
        </div>
      </section>
      <section className="container-zx section mx-auto max-w-[900px] text-center" data-reveal>
        <h2 className="eyebrow">{t.missionTitle}</h2>
        <p className="display mt-6 text-[clamp(1.6rem,3.6vw,2.8rem)]">{t.mission}</p>
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
