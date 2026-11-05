'use client';
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../layout/I18nProvider';
import { ProductCard } from '../product/ProductCard';
import type { Product } from '@/lib/types';

const PAGE = 12;

/** Infinite scroll, with a real button as the fallback for keyboard users. */
export function ProductGrid({ products }: { products: Product[] }) {
  const { t } = useI18n();
  const [shown, setShown] = useState(PAGE);
  const sentinel = useRef<HTMLDivElement>(null);
  const more = shown < products.length;

  useEffect(() => {
    if (!more || !sentinel.current) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) setShown((s) => s + PAGE);
    }, { rootMargin: '400px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [more, shown]);

  return (
    <>
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-12 xl:grid-cols-4">
        {products.slice(0, shown).map((p, i) => (
          <ProductCard key={p.id} product={p} priority={i < 2} sizes="(min-width:1280px) 20vw, (min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw" />
        ))}
      </div>
      {more && (
        <div ref={sentinel} className="mt-12 text-center">
          <button className="btn btn-ghost" onClick={() => setShown((s) => s + PAGE)}>{t.shop.loadMore}</button>
        </div>
      )}
    </>
  );
}
