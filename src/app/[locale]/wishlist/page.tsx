import type { Metadata } from 'next';
import { getDictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/lib/types';
import { WishlistView } from '@/components/shop/WishlistView';

export const metadata: Metadata = { title: 'Wishlist', robots: { index: false } };

export default async function WishlistPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getDictionary(locale);
  return (
    <div className="container-zx min-h-[60vh] py-10 md:py-16">
      <h1 className="display text-[clamp(1.8rem,4vw,3.2rem)]">{t.wishlist.title}</h1>
      <div className="mt-8"><WishlistView /></div>
    </div>
  );
}
