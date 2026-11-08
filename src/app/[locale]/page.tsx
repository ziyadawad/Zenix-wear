import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Gem, Repeat2, Ruler, Truck } from 'lucide-react';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cardProps, getCatalog, getCollections, getContent, getHomeReviews, getSettings } from '@/lib/catalog';
import type { Locale } from '@/lib/types';
import { jsonLd, SITE_URL, CONTACT } from '@/lib/utils';
import { APPROVED_PHOTOS } from '@/lib/approved-photos';
import { Hero } from '@/components/home/Hero';
import { Marquee, OrbitMark, SectionHead } from '@/components/home/Bits';
import { Newsletter } from '@/components/home/Newsletter';
import { ReviewsSlider } from '@/components/home/ReviewsSlider';
import { ProductCard, ProductCarousel } from '@/components/product/ProductCard';

export const revalidate = 300;

export default async function HomePage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  const lp = (p: string) => `/${locale}${p}`;
  const [catalog, content, collections, reviews, settings] = await Promise.all([getCatalog(), getContent(), getCollections(), getHomeReviews(), getSettings()]);

  const newArrivals = [...catalog].filter((p) => p.tags.includes('new')).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map(cardProps);
  const chosen = content.bestSellerIds.map((id) => catalog.find((p) => p.id === id)).filter((p) => p != null);
  const bestSellers = (chosen.length ? chosen : [...catalog].sort((a, b) => b.soldCount - a.soldCount)).slice(0, 8).map(cardProps);
  const featured = collections.find((c) => c.slug === content.featuredCollection) ?? collections[0];
  const cats = (['t-shirts', 'tanks', 'shorts', 'socks', 'accessories', 'collections'] as const).map((id) => ({
    // The T-shirts tile uses the approved photo when it exists; every other tile is a product or texture shot.
    id, label: t.categories[id], image: (id === 't-shirts' && APPROVED_PHOTOS.tshirts?.src) || content.categoryImages[id] || '/images/editorial/gym-bw.webp', href: id === 'collections' ? lp('/collections') : lp(`/shop/${id}`),
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

      {/* Shop by category: t-shirts lead as the large hero tile */}
      <section className="cv section container-zx" aria-labelledby="cat-h">
        <SectionHead id="cat-h" title={t.home.shopByCategory} />
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:grid-rows-2 md:gap-3">
          {cats.map((c, i) => (
            <Link key={c.id} href={c.href} data-reveal style={{ '--d': `${i * 70}ms` } as React.CSSProperties}
              className={`group relative block overflow-hidden bg-surface ${i === 0 ? 'col-span-2 aspect-[4/3.4] md:row-span-2 md:aspect-auto' : c.id === 'collections' ? 'col-span-2 aspect-[2/1] md:col-span-4 md:aspect-[4/1]' : 'aspect-[4/5] md:aspect-[4/4.2]'}`}>
              <Image src={c.image} alt="" fill sizes={i === 0 ? '(min-width:768px) 50vw, 100vw' : c.id === 'collections' ? '100vw' : '(min-width:768px) 25vw, 50vw'} loading="lazy" quality={70} className={`zoom-img object-cover ${i === 0 ? 'object-[50%_30%]' : ''}`} />
              <div className={`absolute inset-0 bg-gradient-to-t from-black/75 ${i === 0 && APPROVED_PHOTOS.tshirts ? 'via-black/30 to-black/25' : 'via-black/10 to-transparent'}`} />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-4 md:p-6">
                <h3 className={`display ${i === 0 || c.id === 'collections' ? 'text-2xl md:text-4xl' : 'text-[15px] md:text-xl'}`}>{c.label}</h3>
                <ArrowRight size={18} strokeWidth={1.25} className="flip-rtl hidden flex-none md:block" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      <section className="cv pb-14 md:pb-24" aria-labelledby="new-h">
        <div className="container-zx"><SectionHead id="new-h" title={t.home.newArrivals} link={{ href: lp('/new-drops'), label: t.home.viewAll }} withArrowSpace /></div>
        <ProductCarousel products={newArrivals} ariaLabel={t.home.newArrivals} />
      </section>

      {/* Featured collection */}
      {featured && (
        <section className="cv grid border-y border-line md:grid-cols-2" aria-labelledby="feat-h">
          <div className="group relative aspect-[4/5] overflow-hidden bg-surface md:aspect-auto md:min-h-[86vh]">
            <Image src={content.featuredCollectionImage || featured.image} alt="" fill sizes="(min-width:768px) 50vw, 100vw" quality={75} className="zoom-img object-cover" />
          </div>
          <div className="flex flex-col justify-center bg-black px-6 py-16 md:px-[8%] md:py-24" data-reveal>
            <p className="eyebrow mb-6">{t.home.featured}</p>
            <h2 id="feat-h" className="display text-[clamp(2rem,4.5vw,4rem)]">{locale === 'ar' ? featured.nameAr : featured.nameEn}</h2>
            <p className="mt-7 max-w-[46ch] leading-[1.9] text-[#c8c8c8]">{locale === 'ar' ? featured.storyAr : featured.storyEn}</p>
            <div className="mt-10"><Link href={lp(`/collections/${featured.slug}`)} className="btn btn-ghost">{t.home.discover}</Link></div>
          </div>
        </section>
      )}

      {/* Best sellers */}
      <section className="cv section container-zx" aria-labelledby="best-h">
        <SectionHead id="best-h" title={t.home.bestSellers} link={{ href: lp('/shop?sort=best'), label: t.home.viewAll }} />
        <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:gap-x-5 lg:grid-cols-4">
          {bestSellers.map((p, i) => <div key={p.id} data-reveal style={{ '--d': `${(i % 4) * 70}ms` } as React.CSSProperties}><ProductCard product={p} /></div>)}
        </div>
      </section>

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
      <section className="cv pb-14 md:pb-24" aria-labelledby="com-h">
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
      </section>

      <Newsletter />
    </>
  );
}
