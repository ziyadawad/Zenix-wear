'use client';
import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Minus, Plus, ShoppingBag, X } from 'lucide-react';
import { fill, useI18n } from './I18nProvider';
import { cartCount, cartSubtotal, cartUi, changeSize, lineId, removeLine, setQty, track, useCart, type CartItem } from '@/lib/client/store';
import { formatMoney, pName } from '@/lib/utils';

export function FreeShippingBar({ subtotal }: { subtotal: number }) {
  const { t, locale, settings } = useI18n();
  const left = settings.freeShippingThreshold - subtotal;
  const pct = Math.min(100, (subtotal / Math.max(settings.freeShippingThreshold, 1)) * 100);
  return (
    <div>
      <p className="mb-2 text-[13px] text-silver">{left > 0 ? fill(t.cart.away, { amount: formatMoney(left, locale) }) : t.cart.unlocked}</p>
      <div className="h-px w-full bg-line" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-[2px] -translate-y-[0.5px] transition-[width] duration-700" style={{ width: `${pct}%`, background: 'var(--chrome)' }} />
      </div>
    </div>
  );
}

export function CartLine({ item, onNavigate }: { item: CartItem; onNavigate?: () => void }) {
  const { t, locale, lp } = useI18n();
  const id = lineId(item);
  return (
    <li className="flex gap-4 border-b border-line py-5">
      <Link href={lp(`/product/${item.slug}`)} onClick={onNavigate} className="relative h-[120px] w-[96px] flex-none overflow-hidden bg-surface">
        <Image src={item.image} alt={pName(item, locale)} fill sizes="96px" quality={70} className="object-cover" />
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link href={lp(`/product/${item.slug}`)} onClick={onNavigate} className="text-sm leading-snug">{pName(item, locale)}</Link>
          <button aria-label={`${t.cart.remove} ${pName(item, locale)}`} onClick={() => removeLine(id)} className="-m-2 flex size-9 flex-none items-center justify-center text-muted hover:text-white"><X size={16} strokeWidth={1.25} /></button>
        </div>
        <p className="mt-1 text-xs text-muted">{locale === 'ar' ? item.colorAr : item.colorEn}</p>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-2">
            {item.sizes.length > 1 ? (
              <select aria-label={t.product.size} value={item.size} onChange={(e) => changeSize(id, e.target.value)} className="h-9 rounded-xs border border-line bg-transparent px-2 text-xs">
                {item.sizes.map((s) => <option key={s.size} value={s.size} disabled={s.stock === 0} className="bg-ink">{s.size}</option>)}
              </select>
            ) : null}
            <div className="flex h-9 items-center border border-line">
              <button className="flex size-9 items-center justify-center" aria-label={t.product.decrease} onClick={() => setQty(id, item.qty - 1)}><Minus size={13} /></button>
              <span className="w-6 text-center text-xs" aria-live="polite">{item.qty}</span>
              <button className="flex size-9 items-center justify-center disabled:opacity-30" aria-label={t.product.increase} disabled={item.qty >= item.maxStock} onClick={() => setQty(id, item.qty + 1)}><Plus size={13} /></button>
            </div>
          </div>
          <p className="text-sm">{formatMoney(item.price * item.qty, locale)}</p>
        </div>
        {item.qty >= item.maxStock && item.maxStock <= 5 && <p className="mt-1 text-xs text-muted">{fill(t.cart.onlyLeft, { n: item.maxStock })}</p>}
      </div>
    </li>
  );
}

export function CartDrawer() {
  const { t, locale, lp } = useI18n();
  const open = cartUi.use();
  const items = useCart();
  const pathname = usePathname();
  const subtotal = cartSubtotal(items);
  const close = () => cartUi.set(false);

  useEffect(() => { close(); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', esc);
    document.documentElement.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', esc); document.documentElement.style.overflow = ''; };
  }, [open]);
  if (!open) return null;

  return (
    <>
      <div className="scrim" onClick={close} aria-hidden="true" />
      <aside role="dialog" aria-modal="true" aria-label={t.cart.title} className="drawer">
        <div className="flex h-[var(--hh)] flex-none items-center justify-between border-b border-line px-5">
          <h2 className="display text-lg">{t.cart.title} <span className="text-muted">({cartCount(items)})</span></h2>
          <button className="icon-btn -me-3" aria-label={t.nav.close} onClick={close} autoFocus><X size={22} strokeWidth={1.25} /></button>
        </div>
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
            <ShoppingBag size={36} strokeWidth={1} className="text-muted" />
            <p className="text-muted">{t.cart.empty}</p>
            <Link href={lp('/shop/t-shirts')} className="btn btn-ghost" onClick={close}>{t.home.shopTshirts}</Link>
          </div>
        ) : (
          <>
            <div className="flex-none border-b border-line px-5 py-4"><FreeShippingBar subtotal={subtotal} /></div>
            <ul className="flex-1 overflow-y-auto px-5">
              {items.map((i) => <CartLine key={lineId(i)} item={i} onNavigate={close} />)}
            </ul>
            <div className="flex-none space-y-3 border-t border-line bg-black px-5 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4">
              <div className="flex justify-between text-sm"><span className="text-muted">{t.cart.subtotal}</span><span>{formatMoney(subtotal, locale)}</span></div>
              <Link href={lp('/checkout')} className="btn btn-primary w-full" onClick={() => { track('InitiateCheckout', { value: subtotal, ids: items.map((i) => i.productId) }); close(); }}>{t.cart.checkout}</Link>
              <Link href={lp('/cart')} className="block py-1 text-center text-sm text-muted underline-offset-4 hover:underline" onClick={close}>{t.cart.viewCart}</Link>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
