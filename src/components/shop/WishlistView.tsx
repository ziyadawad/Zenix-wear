'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '../layout/I18nProvider';
import { ProductCard } from '../product/ProductCard';
import { useWishlist } from '@/lib/client/store';
import { getCards } from '@/app/actions/shop';
import type { Product } from '@/lib/types';

export function WishlistView() {
  const { t, lp } = useI18n();
  const ids = useWishlist();
  const [products, setProducts] = useState<Product[] | null>(null);
  const key = ids.join(',');
  useEffect(() => {
    let live = true;
    if (!key) { setProducts([]); return; }
    getCards(key.split(',')).then((r) => { if (live) setProducts(r); }).catch(() => { if (live) setProducts([]); });
    return () => { live = false; };
  }, [key]);
  if (products === null) return <div className="min-h-[40vh]" aria-busy="true" />;
  // Follows the live id list, so removing an item takes effect immediately.
  const list = products.filter((p) => ids.includes(p.id));
  if (!list.length) {
    return (
      <div className="border border-line px-6 py-24 text-center">
        <p className="text-muted">{t.wishlist.empty}</p>
        <Link href={lp('/shop')} className="btn btn-ghost mt-6">{t.home.shopNow}</Link>
      </div>
    );
  }
  return <><h2 className="sr-only">{t.wishlist.title}</h2><div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 lg:grid-cols-4">{list.map((p) => <ProductCard key={p.id} product={p} />)}</div></>;
}
