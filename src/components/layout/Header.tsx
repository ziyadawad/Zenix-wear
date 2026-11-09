'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, LockKeyhole, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useI18n } from './I18nProvider';
import { cartCount, cartUi, menuUi, searchUi, useCart, useWishlist } from '@/lib/client/store';
import { CONTACT, cx, isNavActive } from '@/lib/utils';

const STROKE = 1.25;

export function languageHref(pathname: string, locale: string) {
  const other = locale === 'ar' ? 'en' : 'ar';
  return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`);
}

export function Header() {
  const { t, locale, lp, categories } = useI18n();
  const pathname = usePathname();
  const cart = useCart();
  const wish = useWishlist();
  const [scrolled, setScrolled] = useState(false);
  const [qs, setQs] = useState('');
  const isHome = pathname === `/${locale}`;
  const overHero = isHome && !scrolled;
  const count = cartCount(cart);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  useEffect(() => { setQs(window.location.search); menuUi.set(false); }, [pathname]);

  // Home / Shop / one link per menu category (Admin → Categories) / Contact. The dashboard link sits at the end.
  const links = ([
    ['/', t.nav.home],
    ['/shop', t.nav.shop],
    ...categories.map((c) => [`/shop/${c.slug}`, c.name] as const),
    ['/contact', t.nav.contact],
  ] as const).map(([section, label]) => ({ href: lp(section), label, active: isNavActive(pathname, locale, section) }));

  return (
    <>
      <header
        style={isHome ? { marginBottom: 'calc(var(--hh) * -1)' } : undefined}
        className={cx('sticky top-0 z-40 h-[var(--hh)] transition-colors duration-500 no-print', overHero ? 'bg-transparent' : 'border-b border-line bg-ink/95 backdrop-blur')}
      >
        <div className="container-zx grid h-full grid-cols-[1fr_auto_1fr] items-center">
          <div className="flex items-center">
            <button className="icon-btn -ms-3 xl:hidden" aria-label={t.nav.menu} onClick={() => menuUi.set(true)}>
              <Menu size={22} strokeWidth={STROKE} />
            </button>
            {/* Phones have Home in the bottom bar. Tablets and small laptops have no full menu, so it sits here. */}
            <Link href={lp('/')} aria-current={isHome ? 'page' : undefined} className={cx('link-underline hidden whitespace-nowrap text-[11px] tracking-[.1em] uppercase transition-opacity hover:opacity-100 md:inline-block xl:hidden rtl:text-[14px] rtl:tracking-normal', !isHome && 'opacity-70')}>{t.nav.home}</Link>
            <nav aria-label={t.nav.menu} className="hidden items-center gap-3.5 xl:flex min-[1400px]:gap-5 2xl:gap-7">
              {links.map((l) => (
                <Link key={l.href} href={l.href} aria-current={l.active ? 'page' : undefined} className={cx('link-underline whitespace-nowrap text-[11px] tracking-[.08em] uppercase transition-opacity hover:opacity-100 min-[1400px]:tracking-[.14em] rtl:text-[14px] rtl:tracking-normal', !l.active && 'opacity-70')}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

          <Link href={lp('/')} aria-label="ZENIX WEAR" className="flex justify-center py-4" dir="ltr">
            <Image src="/brand/wordmark.webp" alt="ZENIX WEAR" width={592} height={56} loading="eager" quality={90} sizes="(min-width: 1024px) 210px, 170px" className="h-auto w-[148px] xs:w-[170px] lg:w-[210px]" />
          </Link>

          <div className="flex items-center justify-end">
            {/* Owner dashboard (password protected), at the end of the header. Plain <a>: never prefetched. Phones and tablets: in the menu. */}
            <a href="/dashboard" rel="nofollow" className="me-2 hidden h-9 items-center gap-1.5 whitespace-nowrap border border-line-strong px-3 text-[11px] tracking-[.08em] uppercase transition-colors hover:border-white lg:inline-flex rtl:text-[13px] rtl:tracking-normal">
              <LockKeyhole size={14} strokeWidth={1.5} aria-hidden="true" />{t.nav.dashboard}
            </a>
            <a href={`${languageHref(pathname, locale)}${qs}`} hrefLang={locale === 'ar' ? 'en' : 'ar'} lang={locale === 'ar' ? 'en' : 'ar'} aria-label={`${t.nav.language}: ${t.nav.languageLabel}`} className="icon-btn text-[12px] tracking-wider" onClick={() => { document.cookie = `zenix_lang=${locale === 'ar' ? 'en' : 'ar'};path=/;max-age=31536000;samesite=lax`; }}>
              {t.nav.language}
            </a>
            <button className="icon-btn hidden md:inline-flex" aria-label={t.nav.search} onClick={() => searchUi.set(true)}><Search size={20} strokeWidth={STROKE} /></button>
            <Link href={lp('/wishlist')} className="icon-btn hidden md:inline-flex" aria-label={t.nav.wishlist}>
              <Heart size={20} strokeWidth={STROKE} />
              {wish.length > 0 && <span className="absolute end-[9px] top-[10px] size-1.5 rounded-full bg-white" />}
            </Link>
            <Link href={lp('/account')} className="icon-btn -me-3 md:me-0" aria-label={t.nav.account}><User size={20} strokeWidth={STROKE} /></Link>
            <button className="icon-btn -me-3 hidden md:inline-flex" aria-label={`${t.nav.cart} (${count})`} onClick={() => cartUi.set(true)}>
              <ShoppingBag size={20} strokeWidth={STROKE} />
              {count > 0 && <span className="absolute end-[4px] top-[6px] flex size-[17px] items-center justify-center rounded-full bg-white text-[10px] font-semibold text-black">{count}</span>}
            </button>
          </div>
        </div>
      </header>
      <MobileMenu links={links} />
    </>
  );
}

function MobileMenu({ links }: { links: { href: string; label: string; active: boolean }[] }) {
  const { t, lp, locale } = useI18n();
  const open = menuUi.use();
  const pathname = usePathname();
  useEffect(() => {
    document.documentElement.style.overflow = open ? 'hidden' : '';
    return () => { document.documentElement.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={t.nav.menu} className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-black" style={{ animation: 'fadeIn .35s ease both' }}>
      <div className="container-zx flex h-[var(--hh)] flex-none items-center justify-between">
        <button className="icon-btn -ms-3" aria-label={t.nav.close} onClick={() => menuUi.set(false)} autoFocus><X size={24} strokeWidth={STROKE} /></button>
        <Image src="/brand/z-mark.webp" alt="" width={64} height={40} className="opacity-90" />
        <a href={languageHref(pathname, locale)} className="icon-btn -me-3 text-[12px]" aria-label={`${t.nav.language}: ${t.nav.languageLabel}`}>{t.nav.language}</a>
      </div>
      <nav className="container-zx flex-1 py-6" aria-label={t.nav.menu}>
        <ul>
          {links.map((l, i) => (
            <li key={l.href} className="slide-rise border-b border-line" style={{ '--d': `${i * 55}ms` } as React.CSSProperties}>
              <Link href={l.href} aria-current={l.active ? 'page' : undefined} className={cx('display block py-5 text-[26px]', !l.active && 'text-muted')} onClick={() => menuUi.set(false)}>{l.label}</Link>
            </li>
          ))}
          <li className="slide-rise border-b border-line" style={{ '--d': `${links.length * 55}ms` } as React.CSSProperties}>
            <a href="/dashboard" rel="nofollow" className="flex items-center gap-3 py-5 text-[20px] text-silver" onClick={() => menuUi.set(false)}>
              <LockKeyhole size={20} strokeWidth={1.5} aria-hidden="true" />{t.nav.dashboard}
            </a>
          </li>
        </ul>
        <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-muted">
          <Link href={lp('/track-order')} onClick={() => menuUi.set(false)} className="py-2">{t.nav.track}</Link>
          <Link href={lp('/faq')} onClick={() => menuUi.set(false)} className="py-2">{t.nav.faq}</Link>
          <Link href={lp('/account')} onClick={() => menuUi.set(false)} className="py-2">{t.nav.account}</Link>
          <a href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer" className="py-2">{t.contact.whatsapp}</a>
        </div>
      </nav>
      <p className="eyebrow container-zx pb-[calc(env(safe-area-inset-bottom)+24px)]">{t.brand.tagline}</p>
    </div>
  );
}
