'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useI18n, fill } from '../layout/I18nProvider';
import { CartLine, FreeShippingBar } from '../layout/CartDrawer';
import { cartSubtotal, lineId, promoStore, track, useCart, usePromo } from '@/lib/client/store';
import { getQuote } from '@/app/actions/shop';
import type { Quote } from '@/lib/orders';
import { formatMoney } from '@/lib/utils';

export function promoMessage(q: Quote | null, t: ReturnType<typeof useI18n>['t'], locale: 'ar' | 'en') {
  if (!q?.promoError) return null;
  return fill(t.cart.promoErrors[q.promoError], { amount: q.promoMin ? formatMoney(q.promoMin, locale) : '' });
}

export function CartPageView() {
  const { t, locale, lp } = useI18n();
  const items = useCart();
  const promo = usePromo();
  const [code, setCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [pending, start] = useTransition();
  const subtotal = cartSubtotal(items);
  const key = items.map((i) => `${lineId(i)}x${i.qty}`).join(',');

  useEffect(() => { setCode(promo); }, [promo]);
  useEffect(() => {
    if (!items.length) return;
    start(async () => setQuote(await getQuote(items.map(({ productId, colorId, size, qty }) => ({ productId, colorId, size, qty })), { promo })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, promo]);

  if (!items.length) {
    return (
      <div className="container-zx flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <h1 className="display text-[clamp(1.8rem,4vw,3rem)]">{t.cart.title}</h1>
        <p className="mt-4 text-muted">{t.cart.empty}</p>
        <Link href={lp('/shop')} className="btn btn-primary mt-8">{t.home.shopNow}</Link>
      </div>
    );
  }
  const discount = quote?.discount ?? 0;
  const err = promoMessage(quote, t, locale);
  return (
    <div className="container-zx py-10 md:py-16">
      <h1 className="display text-[clamp(1.8rem,4vw,3rem)]">{t.cart.title}</h1>
      <div className="mt-8 grid gap-10 lg:grid-cols-[1.6fr_1fr] xl:gap-20">
        <div>
          <FreeShippingBar subtotal={subtotal - discount} />
          <ul className="mt-3 border-t border-line">{items.map((i) => <CartLine key={lineId(i)} item={i} />)}</ul>
        </div>
        <aside className="h-fit border border-line bg-surface p-5 md:p-7 lg:sticky lg:top-[calc(var(--hh)+24px)]">
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); promoStore.set(code.trim().toUpperCase()); }}>
            <input className="field !min-h-11 !py-1 uppercase" dir="ltr" aria-label={t.cart.promo} placeholder={t.cart.promo} value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn btn-ghost !min-h-11 !px-4 flex-none" disabled={pending}>{t.cart.applyPromo}</button>
          </form>
          {err && <p className="error-text" role="alert">{err}</p>}
          {quote?.promoCode && <p className="mt-2 text-[13px] text-success" role="status">{t.cart.promoApplied}: {quote.promoCode}</p>}
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-muted">{t.cart.subtotal}</dt><dd>{formatMoney(subtotal, locale)}</dd></div>
            {discount > 0 && <div className="flex justify-between"><dt className="text-muted">{t.cart.discount}</dt><dd>-{formatMoney(discount, locale)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">{t.cart.shipping}</dt><dd className="text-muted">{t.cart.shippingAtCheckout}</dd></div>
            <div className="flex justify-between border-t border-line pt-3 text-base"><dt>{t.cart.total}</dt><dd>{formatMoney(subtotal - discount, locale)}</dd></div>
          </dl>
          <Link href={lp('/checkout')} className="btn btn-primary mt-6 w-full" onClick={() => track('InitiateCheckout', { value: subtotal, ids: items.map((i) => i.productId) })}>{t.cart.checkout}</Link>
          <Link href={lp('/shop')} className="mt-3 block py-1 text-center text-sm text-muted underline-offset-4 hover:underline">{t.cart.continueShopping}</Link>
        </aside>
      </div>
    </div>
  );
}
