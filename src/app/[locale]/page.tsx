import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gem, Repeat2, Ruler, Truck } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cardProps, getCatalog, getCategories, getContent, getHomeReviews, getSettings } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { jsonLd, SITE_URL, CONTACT } from '@/lib/utils';
import { SCENES } from '@/lib/db/images';
import { Hero } from '@/components/home/Hero';
import { Marquee, OrbitMark, SectionHead } from '@/components/home/Bits';
import { Newsletter } from '@/components/home/Newsletter';
import { ReviewsSlider } from '@/components/home/ReviewsSlider';
import { ProductCard } from '@/components/product/ProductCard';

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const lp = (p: string) => `/${locale}${p}`;
  const [catalog, content, categories, reviews, settings] = await Promise.all([getCatalog(), getContent(), getCategories(), getHomeReviews(), getSettings()]);

  // Every product on sale, the owner's picks first (Admin → Homepage), then best sellers.
  const chosen = content.bestSellerIds.map((id) => catalog.find((p) => p.id === id)).filter((p) => p != null);
  const products = [...chosen, ...[...catalog].sort((a, b) => b.soldCount - a.soldCount).filter((p) => !chosen.includes(p))].slice(0, 8).map(cardProps);
  // One tile per category that has something to sell, so no tile leads to an empty page.
  const cats = categories.filter((c) => c.inMenu && catalog.some((p) => p.category === c.slug)).map((c) => ({
    id: c.slug, label: locale === 'ar' ? c.nameAr : c.nameEn, image: c.image || SCENES.all, href: lp(`/shop/${c.slug}`),
  }));
  const whyIcons = [Gem, Ruler, Truck, Repeat2];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        '@context': 'https://schema.org', '@type': 'Organization', name: 'ZENIX WEAR', url: SITE_URL, logo: `${SITE_URL}/brand/icon-192.png`,
        contactPoint: { '@type': 'ContactPoint', telephone: CONTACT.phoneIntl, contactType: 'customer service', areaServed: 'EG', availableLanguage: ['Arabic', 'English'] },
        sameAs: [settings.instagram, settings.tiktok, settings.facebook].filter(Boolean),
      }) }} />

      <Hero slides={content.hero} />
      <Marquee words={t.home.marquee} />

      {/* Shop by category: one large tile per category */}
      {cats.length > 0 && (
        <section className="cv section container-zx" aria-labelledby="cat-h">
          <SectionHead id="cat-h" title={t.home.shopByCategory} />
          <div className={`grid gap-2 md:gap-3 ${cats.length > 1 ? 'md:grid-cols-2' : ''}`}>
            {cats.map((c, i) => (
              <Link key={c.id} href={c.href} data-reveal style={{ '--d': `${i * 90}ms` } as React.CSSProperties}
                className="glow-card group relative block aspect-[4/3] overflow-hidden bg-surface md:aspect-[5/4]">
                <Image src={c.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" loading="lazy" quality={70} className="zoom-img object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-5 md:p-8">
                  <h3 className="display text-2xl md:text-4xl">{c.label}</h3>
                  <ArrowRight size={20} strokeWidth={1.25} className="flip-rtl flex-none" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* The products */}
      {products.length > 0 && (
        <section className="cv pb-14 md:pb-24 container-zx" aria-labelledby="prod-h">
          <SectionHead id="prod-h" title={t.home.products} link={{ href: lp('/shop'), label: t.home.viewAll }} />
          <div className={`grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 ${products.length > 2 ? 'lg:grid-cols-4' : 'mx-auto max-w-[900px]'}`}>
            {products.map((p, i) => <div key={p.id} data-reveal style={{ '--d': `${(i % 4) * 70}ms` } as React.CSSProperties}><ProductCard product={p} /></div>)}
          </div>
        </section>
      )}

      {/* The meaning of ZENIX */}
      <section className="cv relative overflow-hidden border-y border-line bg-black" aria-labelledby="mean-h">
        <div className="container-zx grid items-center gap-12 py-20 md:py-32 lg:grid-cols-[1fr_1.15fr] lg:gap-20">
          <div className="mx-auto w-[min(72vw,440px)]" data-reveal><OrbitMark /></div>
          <div data-reveal>
            <p className="eyebrow mb-6">{t.home.meaningEyebrow}</p>
            <h2 id="mean-h" className="display text-[clamp(1.9rem,4vw,3.5rem)]">{t.home.meaningTitle}</h2>
            <div className="mt-10 grid gap-8 sm:grid-cols-2">
              <div className="border-t border-line-strong pt-5">
                <h3 className="latin-wide text-sm" dir="ltr">{t.home.zenTitle}</h3>
                <p className="mt-3 text-sm leading-[1.9] text-muted">{t.home.zenText}</p>
              </div>
              <div className="border-t border-line-strong pt-5">
                <h3 className="latin-wide text-sm" dir="ltr">{t.home.zenithTitle}</h3>
                <p className="mt-3 text-sm leading-[1.9] text-muted">{t.home.zenithText}</p>
              </div>
            </div>
            <div className="mt-10 border-t border-line pt-8">
              <p className="font-arabic text-3xl font-light md:text-4xl" lang="ar" dir="rtl">سَمْت الرأس</p>
              <h3 className="eyebrow mt-5">{t.home.originTitle}</h3>
              <p className="mt-3 max-w-[60ch] text-sm leading-[1.9] text-[#c8c8c8]">{t.home.originText}</p>
            </div>
            <Link href={lp('/about')} className="link-underline mt-8 inline-block text-sm">{t.home.readStory}</Link>
          </div>
        </div>
      </section>

      {/* Why ZENIX */}
      <section className="cv section container-zx" aria-labelledby="why-h">
        <SectionHead id="why-h" title={t.home.why} center />
        <ul className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
          {t.home.whyItems.map(([title, text], i) => {
            const Icon = whyIcons[i];
            return (
              <li key={title} className="bg-ink p-5 text-center md:p-10" data-reveal style={{ '--d': `${i * 80}ms` } as React.CSSProperties}>
                <Icon size={28} strokeWidth={1} className="mx-auto text-silver" />
                <h3 className="mt-5 text-sm font-medium">{title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-muted">{text}</p>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Reviews */}
      {reviews.length > 0 && (
        <section className="cv pb-14 md:pb-24" aria-labelledby="rev-h">
          <div className="container-zx"><SectionHead id="rev-h" title={t.home.reviews} withArrowSpace /></div>
          <ReviewsSlider reviews={reviews} />
        </section>
      )}

      {/* Community */}
      {content.community.length > 0 && <section className="cv pb-14 md:pb-24" aria-labelledby="com-h">
        <div className="container-zx mb-8 text-center md:mb-12">
          <p className="latin-wide text-sm text-silver md:text-base" dir="ltr">#ZENIXWEAR</p>
          <h2 id="com-h" className="display h-section mt-4">{t.home.community}</h2>
          <p className="mt-3 text-sm text-muted">{t.home.communityText}</p>
        </div>
        <div className="grid grid-cols-3 gap-1 md:grid-cols-6">
          {content.community.slice(0, 6).map((src, i) => (
            <a key={src + i} href={settings.instagram || lp('/contact')} {...(settings.instagram ? { target: '_blank', rel: 'noopener noreferrer' } : {})} aria-label={`${t.home.followUs} ${i + 1}`} className="group relative block aspect-square overflow-hidden bg-surface">
              <Image src={src} alt="" fill sizes="(min-width:768px) 17vw, 33vw" quality={70} className="zoom-img object-cover" />
            </a>
          ))}
        </div>
      </section>}

      <Newsletter />
    </>
  );
}
