'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useI18n } from '../layout/I18nProvider';
import { ProductCarousel } from './ProductCard';
import { pushRecent, track, useRecent } from '@/lib/client/store';
import { getCards } from '@/app/actions/shop';
import type { Product } from '@/lib/types';
import { effectivePrice } from '@/lib/utils';

interface State { product: Product; colorId: string; setColorId: (c: string) => void; size: string | null; setSize: (s: string | null) => void }
const Ctx = createContext<State | null>(null);
export function useProductState() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useProductState outside provider');
  return c;
}

/** Shares the selected colour between the gallery and the buy box. */
export function ProductStateProvider({ product, children }: { product: Product; children: React.ReactNode }) {
  const first = product.colors.find((c) => product.variants.some((v) => v.colorId === c.id && v.stock > 0)) ?? product.colors[0];
  const [colorId, setColorId] = useState(first?.id ?? '');
  const [size, setSize] = useState<string | null>(null);
  useEffect(() => {
    pushRecent(product.id);
    track('ViewContent', { id: product.id, name: product.nameEn, value: effectivePrice(product) });
  }, [product]);
  const value = useMemo(() => ({ product, colorId, setColorId, size, setSize }), [product, colorId, size]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function RecentlyViewed({ currentId }: { currentId: string }) {
  const { t } = useI18n();
  const ids = useRecent();
  const [list, setList] = useState<Product[]>([]);
  const key = ids.filter((id) => id !== currentId).slice(0, 8).join(',');
  useEffect(() => {
    if (!key) return;
    let live = true;
    getCards(key.split(',')).then((r) => { if (live) setList(r); }).catch(() => {});
    return () => { live = false; };
  }, [key]);
  if (!list.length) return null;
  return (
    <section className="pt-14 md:pt-24" aria-labelledby="recent-h">
      <h2 id="recent-h" className="display h-section container-zx mb-8 md:mb-12">{t.product.recentlyViewed}</h2>
      <ProductCarousel products={list} ariaLabel={t.product.recentlyViewed} />
    </section>
  );
}
