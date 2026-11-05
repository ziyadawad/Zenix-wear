'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, Search, ShoppingBag, Store } from 'lucide-react';
import { useI18n } from './I18nProvider';
import { cartCount, cartUi, searchUi, useCart, useWishlist } from '@/lib/client/store';
import { CONTACT, cx } from '@/lib/utils';
import type { Localized } from '@/lib/types';

/** Slim rotating announcement bar. */
export function AnnouncementBar({ items }: { items: Localized[] }) {
  const { locale } = useI18n();
  const [i, setI] = useState(0);
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % items.length), 4200);
    return () => clearInterval(id);
  }, [items.length]);
  if (!items.length) return null;
  return (
    <div className="no-print relative z-50 flex h-[var(--ann)] items-center justify-center overflow-hidden border-b border-line bg-black px-4 text-center">
      <p key={i} className="announce-item truncate text-[11px] tracking-[.14em] uppercase text-silver rtl:text-[12px] rtl:tracking-normal" aria-live="off">
        {items[i % items.length]?.[locale]}
      </p>
    </div>
  );
}

export function BottomNav() {
  const { t, lp, locale } = useI18n();
  const pathname = usePathname();
  const cart = useCart();
  const wish = useWishlist();
  const count = cartCount(cart);
  if (pathname.endsWith('/checkout')) return null;
  const isHome = pathname === `/${locale}`;
  const item = 'flex flex-1 flex-col items-center justify-center gap-[3px] text-[10px] min-h-[60px] rtl:text-[11px] relative';
  return (
    <nav aria-label={t.nav.menu} className="no-print fixed inset-x-0 bottom-0 z-50 flex border-t border-line bg-black pb-[env(safe-area-inset-bottom)] md:hidden">
      <Link href={lp('/')} className={cx(item, !isHome && 'text-muted')}><Home size={20} strokeWidth={1.25} />{t.nav.home}</Link>
      <Link href={lp('/shop')} className={cx(item, !pathname.startsWith(lp('/shop')) && 'text-muted')}><Store size={20} strokeWidth={1.25} />{t.nav.shop}</Link>
      <button className={cx(item, 'text-muted')} onClick={() => searchUi.set(true)}><Search size={20} strokeWidth={1.25} />{t.nav.search}</button>
      <Link href={lp('/wishlist')} className={cx(item, !pathname.startsWith(lp('/wishlist')) && 'text-muted')}>
        <span className="relative"><Heart size={20} strokeWidth={1.25} />{wish.length > 0 && <span className="absolute -end-1 -top-0.5 size-1.5 rounded-full bg-white" />}</span>
        {t.nav.wishlist}
      </Link>
      <button className={cx(item, 'text-muted')} onClick={() => cartUi.set(true)}>
        <span className="relative">
          <ShoppingBag size={20} strokeWidth={1.25} />
          {count > 0 && <span className="absolute -end-2 -top-1.5 flex size-4 items-center justify-center rounded-full bg-white text-[9px] font-semibold text-black">{count}</span>}
        </span>
        {t.nav.cart}
      </button>
    </nav>
  );
}

export function WhatsAppFloat() {
  const { t } = useI18n();
  return (
    <a
      href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label={t.common.whatsappFloat} title={t.common.whatsappFloat}
      style={{ bottom: 'calc(var(--bottom-nav) + var(--float-extra, 0px) + 16px)' }}
      className="no-print fixed end-4 z-30 flex size-12 items-center justify-center rounded-full border border-silver/60 bg-black text-silver transition-[bottom,background-color,color] duration-300 hover:bg-white hover:text-black md:end-6 md:size-13"
    >
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6l.4-.5c.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.6-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3zM12 2C6.5 2 2 6.5 2 12c0 1.8.5 3.5 1.3 5L2 22l5.1-1.3c1.4.8 3.1 1.3 4.9 1.3 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3C4 15.100 3.700 13.600 3.700 12 3.800 7.500 7.500 3.800 12 3.800s8.200 3.700 8.200 8.200-3.700 8.200-8.200 8.200z" /></svg>
    </a>
  );
}

/** Small white dot that grows over links. Mouse-style pointers only. */
export function Cursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  useEffect(() => { setEnabled(window.matchMedia('(hover: hover) and (pointer: fine)').matches); }, []);
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current!;
    let x = 0, y = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (x - cx) * 0.35; cy += (y - cy) * 0.35;
      el.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      raf = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      x = e.clientX; y = e.clientY;
      if (!el.classList.contains('on')) { cx = x; cy = y; el.classList.add('on'); }
      el.classList.toggle('grow', !!(e.target as Element)?.closest?.('a,button,[role=button],select,label,summary'));
    };
    const leave = () => el.classList.remove('on');
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('mouseleave', leave);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', move);
      document.documentElement.removeEventListener('mouseleave', leave);
    };
  }, [enabled]);
  return enabled ? <div ref={ref} className="zx-cursor no-print" aria-hidden="true" /> : null;
}

/** One IntersectionObserver for all [data-reveal] elements, re-scanned on navigation. */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    const scan = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io.observe(el));
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [pathname]);
  return null;
}
