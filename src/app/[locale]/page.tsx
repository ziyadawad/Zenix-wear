import { Gem, Repeat2, Ruler, Truck } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cardProps, getCatalog, getContent, getHomeReviews, getSettings } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { jsonLd, SITE_URL, CONTACT } from '@/lib/utils';
import { Hero } from '@/components/home/Hero';
import { Marquee, SectionHead } from '@/components/home/Bits';
import { Newsletter } from '@/components/home/Newsletter';
import { ReviewsSlider } from '@/components/home/ReviewsSlider';
import { ProductCard } from '@/components/product/ProductCard';
import { ProductScene } from '@/components/product/ProductScene';

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const lp = (p: string) => `/${locale}${p}`;
  const [catalog, content, reviews, settings] = await Promise.all([getCatalog(), getContent(), getHomeReviews(), getSettings()]);

  // Every product on sale, the owner's picks first (Admin → Homepage), then best sellers.
  const chosen = content.bestSellerIds.map((id) => catalog.find((p) => p.id === id)).filter((p) => p != null);
  const products = [...chosen, ...[...catalog].sort((a, b) => b.soldCount - a.soldCount).filter((p) => !chosen.includes(p))].slice(0, 8).map(cardProps);
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

      {/* The products */}
      {products.length > 0 && (
        <section className="cv pt-[clamp(3.5rem,8vw,7.5rem)] pb-14 md:pb-24 container-zx" aria-labelledby="prod-h">
          <SectionHead id="prod-h" title={t.home.products} link={{ href: lp('/shop'), label: t.home.viewAll }} />
          <div className={`grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 ${products.length > 2 ? 'lg:grid-cols-4' : 'mx-auto max-w-[900px]'}`}>
            {products.map((p, i) => <div key={p.id} data-reveal style={{ '--d': `${(i % 4) * 70}ms` } as React.CSSProperties}><ProductCard product={p} /></div>)}
          </div>
        </section>
      )}

      <div className="ambient-divider container-zx" aria-hidden="true"><span className="ambient-strip" /></div>

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
              <ProductScene src={src} alt="" sizes="(min-width:768px) 17vw, 33vw" />
            </a>
          ))}
        </div>
      </section>}

      <Newsletter />
    </>
  );
}
