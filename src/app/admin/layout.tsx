import type { Metadata, Viewport } from 'next';
import { Inter, Italiana, Michroma } from 'next/font/google';
import '../globals.css';

const italiana = Italiana({ weight: '400', subsets: ['latin'], variable: '--font-italiana', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const michroma = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-michroma', display: 'swap', preload: false });

export const metadata: Metadata = { title: 'ZENIX Admin', robots: { index: false, follow: false } };
export const viewport: Viewport = { themeColor: '#000000', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${italiana.variable} ${inter.variable} ${michroma.variable}`}>
      <body>{children}</body>
    </html>
  );
}
