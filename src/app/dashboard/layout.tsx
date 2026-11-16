import type { Metadata, Viewport } from 'next';
import { Cairo, Inter } from 'next/font/google';
import { dashLang } from '@/lib/dashboard/server-lang';
import '../globals.css';
import '@/components/dashboard/dashboard.css';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], variable: '--font-cairo', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap', preload: false });

export const metadata: Metadata = {
  title: 'ZENIX · Dashboard',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};
// themeColor matches --d-bg in src/components/dashboard/dashboard.css
export const viewport: Viewport = { themeColor: '#07070c', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default async function DashboardRoot({ children }: { children: React.ReactNode }) {
  const lang = await dashLang();
  return (
    <html lang={lang} dir={lang === 'en' ? 'ltr' : 'rtl'} className={`${cairo.variable} ${inter.variable}`}>
      <body className="dash-app">{children}</body>
    </html>
  );
}
