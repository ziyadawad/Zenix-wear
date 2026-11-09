'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Plus } from 'lucide-react';
import { CarouselShell } from './CarouselShell';
import { useI18n } from '../layout/I18nProvider';
import { addToCart, cartUi, toggleWish, track, useWishlist } from '@/lib/client/store';
import type { Product } from '@/lib/types';
import { cx, discountPercent, effectivePrice, formatMoney, pName, sizesOf, stockOf } from '@/lib/utils';
import { displayImage } from '@/lib/db/images';

export function buildCartItem(p: Product, colorId: string, size: string, qty = 1) {
  const c = p.colors.find((x) => x.id === colorId)!;
  return {
    productId: p.id, colorId, size, qty, slug: p.slug, nameAr: p.nameAr, nameEn: p.nameEn, image: c.images[0] ?? '',
    price: effectivePrice(p), compareAt: p.salePrice != null && p.salePrice < p.price ? p.price : null,
    colorAr: c.nameAr, colorEn: c.nameEn, maxStock: stockOf(p, colorId, size),
    sizes: sizesOf(p).map((s) => ({ size: s, stock: stockOf(p, colorId, s) })),
  };
}

export function Price({ p, className }: { p: Pick<Product, 'price' | 'salePrice'>; className?: string }) {
  const { locale, t } = useI18n();
  const pct = discountPercent(p);
  return (
    <p className={cx('flex flex-wrap items-baseline gap-x-2', className)}>
      <span>{formatMoney(effectivePrice(p), locale)}</span>
      {pct > 0 && <><s className="text-[0.85em] text-muted">{formatMoney(p.price, locale)}</s><span className="sr-only">{pct}% {t.product.off}</span></>}
    </p>
  );
}

export function ProductCard({ product: p, priority, sizes = '(min-width:1024px) 25vw, (min-width:768px) 33vw, 50vw' }: { product: Product; priority?: boolean; sizes?: string }) {
  const { t, locale, lp } = useI18n();
  const wish = useWishlist();
  const [colorId, setColorId] = useState(p.colors[0]?.id);
  const [quick, setQuick] = useState(false);
  // The hover photo is only requested once a mouse actually arrives.
  const [hovered, setHovered] = useState(false);
  const color = p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  const name = pName(p, locale);
  const wished = wish.includes(p.id);
  const allSizes = sizesOf(p);
  const soldOut = !p.variants.some((v) => v.stock > 0);
  const tag = soldOut ? t.shop.soldOut : p.tags[0] ? t.tags[p.tags[0]] : null;
  const pct = discountPercent(p);

  const add = (size: string) => {
    addToCart(buildCartItem(p, color.id, size));
    track('AddToCart', { id: p.id, name: p.nameEn, value: effectivePrice(p) });
    setQuick(false);
    cartUi.set(true);
  };

  return (
    <article className="group relative" onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHovered(true); }}>
      <div className="relative aspect-[4/5] overflow-hidden bg-[#0d0d0d]">
        <Link href={lp(`/product/${p.slug}`)} aria-label={name} className="absolute inset-0 block">
          <Image src={color?.images[0] ?? displayImage(null)} alt={`${name}, ${locale === 'ar' ? color.nameAr : color.nameEn}`} fill sizes={sizes} quality={70} loading={priority ? 'eager' : 'lazy'} className={cx('zoom-img object-contain p-[5%]', hovered && color.images[1] && 'group-hover:opacity-0', 'transition-opacity duration-700')} />
          {hovered && color?.images[1] && <Image src={color.images[1]} alt="" fill sizes={sizes} quality={70} className="object-contain p-[5%] opacity-0 transition-opacity duration-700 group-hover:opacity-100" />}
        </Link>
        {tag && <span className={cx('pointer-events-none absolute start-2.5 top-2.5 px-2 py-1 text-[9px] tracking-[.14em] uppercase rtl:text-[11px] rtl:tracking-normal md:start-3 md:top-3', soldOut ? 'bg-raised text-muted' : 'bg-white text-black')}>{tag}{!soldOut && p.tags[0] === 'sale' && pct > 0 ? ` -${pct}%` : ''}</span>}
        <button aria-label={wished ? t.shop.removeWish : t.shop.addWish} aria-pressed={wished} onClick={() => toggleWish(p.id)} className="absolute end-0.5 top-0.5 flex size-11 items-center justify-center">
          <Heart size={18} strokeWidth={1.25} fill={wished ? '#fff' : 'none'} />
        </button>

        {!soldOut && (
          <>
            <button aria-label={`${t.shop.quickAdd}: ${name}`} aria-expanded={quick} onClick={() => setQuick((q) => !q)} className="absolute bottom-1 end-1 flex size-11 items-center justify-center lg:hidden">
              <span className="flex size-8 items-center justify-center rounded-full bg-black/70 backdrop-blur"><Plus size={15} strokeWidth={1.5} className={cx('transition-transform', quick && 'rotate-45')} /></span>
            </button>
            <div className={cx('absolute inset-x-0 bottom-0 bg-black/85 p-2.5 backdrop-blur transition-all duration-400', quick ? 'translate-y-0 opacity-100 pe-12 lg:pe-2.5' : 'pointer-events-none translate-y-full opacity-0 lg:group-focus-within:pointer-events-auto lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100 lg:group-hover:pointer-events-auto lg:group-hover:translate-y-0 lg:group-hover:opacity-100')}>
              <p className="mb-1.5 hidden text-[10px] tracking-[.14em] uppercase text-muted rtl:text-[11px] rtl:tracking-normal lg:block">{t.shop.quickAdd}</p>
              <div className="flex flex-wrap gap-1" dir="ltr">
                {allSizes.map((s) => {
                  const out = stockOf(p, color.id, s) === 0;
                  return (
                    <button key={s} disabled={out} onClick={() => add(s)} aria-label={`${t.product.size} ${s}${out ? `, ${t.shop.soldOut}` : ''}`} className={cx('h-9 min-w-9 flex-1 border border-line-strong px-1 text-[11px] transition-colors', out ? 'text-muted/60 line-through' : 'hover:bg-white hover:text-black')}>
                      {s === 'ONE' ? t.shop.quickAdd : s}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="pt-3">
        <h3 className="text-[13px] leading-snug md:text-sm"><Link href={lp(`/product/${p.slug}`)} className="hover:opacity-70">{name}</Link></h3>
        <Price p={p} className="mt-1 text-[13px] text-silver md:text-sm" />
        {p.colors.length > 1 && (
          <div className="-ms-3 mt-0.5 flex" role="group" aria-label={t.product.color}>
            {p.colors.map((c) => (
              <button key={c.id} aria-label={locale === 'ar' ? c.nameAr : c.nameEn} aria-pressed={c.id === color.id} onClick={() => setColorId(c.id)} className="flex size-9 items-center justify-center">
                <span className={cx('size-3 rounded-full border transition-shadow', c.id === color.id ? 'border-white ring-1 ring-white ring-offset-2 ring-offset-ink' : 'border-line-strong')} style={{ background: c.hex }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function ProductCarousel({ products, ariaLabel }: { products: Product[]; ariaLabel: string }) {
  return (
    <CarouselShell ariaLabel={ariaLabel}>
      {products.map((p) => (
        <div key={p.id} className="w-[calc(50vw-22px)] sm:w-[calc(33.33vw-20px)] md:w-[calc(33.33vw-32px)] lg:w-[calc(25vw-40px)] 2xl:max-w-[400px]">
          <ProductCard product={p} sizes="(min-width:1024px) 25vw, (min-width:640px) 33vw, 50vw" />
        </div>
      ))}
    </CarouselShell>
  );
}

