import type { Metadata, Viewport } from 'next';
import { Cairo, Inter, Italiana, Michroma } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { getCategories, getContent, getSettings } from '@/lib/catalog';
import { isLocale, type Locale } from '@/lib/types';
import { SITE_URL } from '@/lib/utils';
import { I18nProvider } from '@/components/layout/I18nProvider';
import { Header } from '@/components/layout/Header';
import { AnnouncementBar, BottomNav, Cursor, RevealObserver, WhatsAppFloat } from '@/components/layout/Chrome';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/layout/CartDrawer';
import { SearchOverlay } from '@/components/layout/SearchOverlay';
import { Analytics } from '@/components/layout/Analytics';

const italiana = Italiana({ weight: '400', subsets: ['latin'], variable: '--font-italiana', display: 'swap', preload: false });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma', display: 'swap', preload: false });
const cairo = Cairo({ subsets: ['arabic'], weight: ['300', '400', '500', '600'], variable: '--font-cairo', display: 'swap' });

// Rendered on first request, then cached and refreshed when the admin edits something.
export const generateStaticParams = () => [];
export const revalidate = 300;

export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const ar = locale === 'ar';
  const title = ar ? 'ZENIX WEAR | لبس رياضي فاخر في مصر' : 'ZENIX WEAR | Premium Sportswear in Egypt';
  const description = ar
    ? 'دماغ هادية، وأداء في القمة. تيشيرتات ولبس جيم فاخر، بنوصل لكل مصر والدفع عند الاستلام.'
    : 'Calm Mind. Peak Performance. Premium t-shirts and gym wear, delivered across Egypt with cash on delivery.';
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: '%s | ZENIX WEAR' },
    description,
    applicationName: 'ZENIX WEAR',
    manifest: '/manifest.webmanifest',
    alternates: { canonical: `/${locale}`, languages: { ar: '/ar', en: '/en', 'x-default': '/ar' } },
    openGraph: { type: 'website', siteName: 'ZENIX WEAR', title, description, locale: ar ? 'ar_EG' : 'en_EG', images: [{ url: '/brand/og.jpg', width: 1200, height: 630, alt: 'ZENIX WEAR' }] },
    twitter: { card: 'summary_large_image', title, description, images: ['/brand/og.jpg'] },
  };
}

// Runs before first paint: enables scroll reveals and shows the loader on a first visit only.
const BOOT = `(function(){var d=document.documentElement;d.classList.add('js');try{if(!localStorage.getItem('zx_seen')){localStorage.setItem('zx_seen','1');d.classList.add('zx-loading');setTimeout(function(){d.classList.remove('zx-loading')},1300)}}catch(e){}})()`;

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale: Locale = raw;
  const t = getDictionary(locale);
  const [content, settings, allCategories] = await Promise.all([getContent(), getSettings(), getCategories()]);
  const categories = allCategories.filter((c) => c.inMenu).map((c) => ({ slug: c.slug, name: locale === 'ar' ? c.nameAr : c.nameEn }));
  const publicSettings = { freeShippingThreshold: settings.freeShippingThreshold, instagram: settings.instagram, tiktok: settings.tiktok, facebook: settings.facebook };

  return (
    <html lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`${italiana.variable} ${inter.variable} ${michroma.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: BOOT }} /></head>
      <body>
        <div className="zx-loader" aria-hidden="true">
          <div className="relative w-[150px]" style={{ perspective: 600 }} dir="ltr">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/z-ring.webp" alt="" width={694} height={427} loading="lazy" className="lr absolute inset-0 h-auto w-full" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/z-only.webp" alt="" width={694} height={427} loading="lazy" className="lz relative h-auto w-full" />
          </div>
        </div>
        <I18nProvider dict={t} locale={locale} settings={publicSettings} categories={categories}>
          <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-[120] focus:bg-white focus:px-4 focus:py-2 focus:text-black">{t.nav.skip}</a>
          <AnnouncementBar items={content.announcements} />
          <Header />
          <main id="main">{children}</main>
          <Footer t={t} locale={locale} settings={settings} categories={categories} />
          <BottomNav />
          <WhatsAppFloat />
          <CartDrawer />
          <SearchOverlay />
          <Cursor />
          <RevealObserver />
          <Analytics metaPixelId={settings.metaPixelId} tiktokPixelId={settings.tiktokPixelId} gaId={settings.gaId} />
        </I18nProvider>
      </body>
    </html>
  );
}
