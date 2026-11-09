import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { cardProps, getCatalog, getCategories, getProduct, getProductReviews, getSettings } from '@/lib/catalog';
import type { Locale, Product } from '@/lib/types';
import { effectivePrice, formatMoney, jsonLd, pName, SITE_URL, totalStock } from '@/lib/utils';
import { Gallery } from '@/components/product/Gallery';
import { BuyBox } from '@/components/product/BuyBox';
import { Accordion } from '@/components/ui/Accordion';
import { ProductCarousel } from '@/components/product/ProductCard';
import { RecentlyViewed, ProductStateProvider } from '@/components/product/ProductClient';
import { ReviewsBlock } from '@/components/product/ReviewsBlock';

type P = { params: Promise<{ locale: Locale; slug: string }> };
export const revalidate = 300;
export const generateStaticParams = () => [];

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProduct(slug);
  if (!p) return {};
  const name = pName(p, locale);
  const description = (locale === 'ar' ? p.descAr : p.descEn).slice(0, 160);
  const image = p.colors[0]?.images[0];
  return {
    title: name, description,
    alternates: { canonical: `/${locale}/product/${slug}`, languages: { ar: `/ar/product/${slug}`, en: `/en/product/${slug}` } },
    openGraph: { title: `${name} | ZENIX WEAR`, description, type: 'website', images: image ? [{ url: image, width: 1200, height: 1500, alt: name }] : ['/brand/og.jpg'] },
  };
}

/** The other products in stock, from other categories first (e.g. the sleeveless tee on the short-sleeve page). */
function completeTheLook(p: Product, all: Product[]) {
  return all.filter((x) => x.category !== p.category && totalStock(x) > 0).sort((a, b) => b.soldCount - a.soldCount).slice(0, 6);
}

export default async function ProductPage({ params }: P) {
  const { locale, slug } = await params;
  const t = getDictionary(locale);
  const [p, catalog, settings, categories] = await Promise.all([getProduct(slug), getCatalog(), getSettings(), getCategories()]);
  // Products that were removed (old links, shared posts) land on the shop instead of a 404.
  if (!p) redirect(`/${locale}/shop`);
  const cat = categories.find((c) => c.slug === p.category);
  const reviews = await getProductReviews(p.id);
  const realReviews = reviews.filter((r) => !r.isDemo);
  const name = pName(p, locale);
  const look = completeTheLook(p, catalog).map(cardProps);
  const also = catalog.filter((x) => x.category === p.category && x.id !== p.id).sort((a, b) => b.soldCount - a.soldCount).slice(0, 8).map(cardProps);
  const url = `${SITE_URL}/${locale}/product/${p.slug}`;

  return (
    <ProductStateProvider product={p}>
      {/* Sample reviews are left out of structured data: only real customer reviews are declared to search engines. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        '@context': 'https://schema.org', '@type': 'Product', name, sku: p.sku, brand: { '@type': 'Brand', name: 'ZENIX WEAR' },
        description: locale === 'ar' ? p.descAr : p.descEn,
        image: p.colors.flatMap((c) => c.images).slice(0, 6).map((i) => (i.startsWith('http') ? i : `${SITE_URL}${i}`)),
        offers: { '@type': 'Offer', url, priceCurrency: 'EGP', price: effectivePrice(p), availability: totalStock(p) > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', itemCondition: 'https://schema.org/NewCondition' },
        ...(realReviews.length ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: (realReviews.reduce((a, r) => a + r.rating, 0) / realReviews.length).toFixed(1), reviewCount: realReviews.length } } : {}),
      }) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: t.nav.shop, item: `${SITE_URL}/${locale}/shop` },
          { '@type': 'ListItem', position: 2, name: cat ? (locale === 'ar' ? cat.nameAr : cat.nameEn) : t.nav.shop, item: `${SITE_URL}/${locale}/shop/${p.category}` },
          { '@type': 'ListItem', position: 3, name, item: url },
        ],
      }) }} />

      <div className="pdp-grid lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-14 lg:pt-8 xl:gap-20">
        <Gallery />
        <div className="container-zx lg:!px-0">
          <div className="pt-6 lg:sticky lg:top-[calc(var(--hh)+24px)] lg:pt-0">
            <BuyBox />
            <div className="mt-8 border-t border-line">
              <Accordion title={t.product.description} open>
                <p className="pb-5 leading-[1.9] text-[#c8c8c8]">{locale === 'ar' ? p.descAr : p.descEn}</p>
                {(p.fitAr || p.fitEn) && <p className="pb-5 text-sm leading-[1.9] text-muted"><span className="text-white">{t.product.fit}: </span>{locale === 'ar' ? p.fitAr : p.fitEn}</p>}
                <p className="pb-5 text-xs text-muted">{t.product.sku}: <bdi>{p.sku}</bdi></p>
              </Accordion>
              <Accordion title={t.product.fabricCare}>
                <p className="pb-3 leading-[1.9] text-[#c8c8c8]">{locale === 'ar' ? p.fabricAr : p.fabricEn}</p>
                <p className="pb-5 leading-[1.9] text-[#c8c8c8]">{locale === 'ar' ? p.careAr : p.careEn}</p>
              </Accordion>
              <Accordion title={t.product.shippingExchange}>
                <p className="pb-5 leading-[1.9] text-[#c8c8c8]">{t.product.shippingText.replace('{amount}', formatMoney(settings.freeShippingThreshold, locale))}</p>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <ReviewsBlock productId={p.id} reviews={reviews} rating={p.rating} count={p.reviewCount} />

      {look.length > 0 && (
        <section className="pt-14 md:pt-24" aria-labelledby="look-h">
          <h2 id="look-h" className="display h-section container-zx mb-8 md:mb-12">{t.product.completeLook}</h2>
          <ProductCarousel products={look} ariaLabel={t.product.completeLook} />
        </section>
      )}
      {also.length > 0 && (
        <section className="pt-14 md:pt-24" aria-labelledby="also-h">
          <h2 id="also-h" className="display h-section container-zx mb-8 md:mb-12">{t.product.youMayLike}</h2>
          <ProductCarousel products={also} ariaLabel={t.product.youMayLike} />
        </section>
      )}
      <RecentlyViewed currentId={p.id} />
      <div className="h-14 md:h-24" />
    </ProductStateProvider>
  );
}
