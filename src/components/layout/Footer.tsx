import Image from 'next/image';
import Link from 'next/link';
import { LockKeyhole, Mail, Phone } from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale, SiteSettings } from '@/lib/types';
import { CONTACT } from '@/lib/utils';
import { SocialLinks } from './SocialLinks';
import type { MenuCategory } from './I18nProvider';

export function Footer({ t, locale, settings, categories }: { t: Dictionary; locale: Locale; settings: SiteSettings; categories: MenuCategory[] }) {
  const lp = (p: string) => `/${locale}${p}`;
  const col = 'inline-block py-1 text-sm text-muted transition-colors hover:text-white';
  return (
    <footer className="no-print border-t border-line bg-black pb-safe-nav">
      <div className="container-zx py-14 md:py-20">
        <div className="flex flex-col items-center text-center">
          <Image src="/brand/wordmark.webp" alt="ZENIX WEAR" width={592} height={56} loading="lazy" className="h-auto w-[240px] md:w-[340px]" />
        </div>
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-line pt-12 md:grid-cols-4">
          <div>
            <h2 className="eyebrow mb-5">{t.footer.shop}</h2>
            <ul className="space-y-1.5">
              <li><Link className={col} href={lp('/shop')}>{t.categoryBlurb.all}</Link></li>
              {categories.map((c) => <li key={c.slug}><Link className={col} href={lp(`/shop/${c.slug}`)}>{c.name}</Link></li>)}
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-5">{t.footer.help}</h2>
            <ul className="space-y-1.5">
              <li><Link className={col} href={lp('/track-order')}>{t.nav.track}</Link></li>
              <li><Link className={col} href={lp('/faq')}>{t.nav.faq}</Link></li>
              <li><Link className={col} href={lp('/shipping-policy')}>{t.footer.shippingPolicy}</Link></li>
              <li><Link className={col} href={lp('/exchange-policy')}>{t.footer.exchangePolicy}</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="eyebrow mb-5">{t.footer.brand}</h2>
            <ul className="space-y-1.5">
              <li><Link className={col} href={lp('/about')}>{t.nav.about}</Link></li>
              <li><Link className={col} href={lp('/contact')}>{t.nav.contact}</Link></li>
              <li><Link className={col} href={lp('/privacy')}>{t.footer.privacy}</Link></li>
              <li><Link className={col} href={lp('/terms')}>{t.footer.terms}</Link></li>
              <li><a className={`${col} inline-flex items-center gap-2 !text-silver`} href="/dashboard" rel="nofollow"><LockKeyhole size={14} strokeWidth={1.5} aria-hidden="true" />{t.nav.dashboard}</a></li>
            </ul>
          </div>
          <div className="col-span-2 md:col-span-1">
            <h2 className="eyebrow mb-5">{t.footer.contact}</h2>
            <ul className="space-y-1.5">
              <li><a className={`${col} inline-flex items-center gap-2`} href={`tel:${CONTACT.phone}`} dir="ltr"><Phone size={14} strokeWidth={1.25} />{CONTACT.phone}</a></li>
              <li><a className={`${col} inline-flex items-center gap-2 break-all`} href={`mailto:${CONTACT.email}`}><Mail size={14} strokeWidth={1.25} className="flex-none" />{CONTACT.email}</a></li>
              <li><a className={col} href={CONTACT.whatsappUrl} target="_blank" rel="noopener noreferrer">{t.contact.whatsapp}</a></li>
            </ul>
            <SocialLinks settings={settings} locale={locale} className="mt-5 -ms-3" />
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 text-center text-xs text-muted md:flex-row">
          <p>© {new Date().getFullYear()} ZENIX WEAR. {t.footer.rights}</p>
          <p>{t.footer.payments}</p>
        </div>
      </div>
    </footer>
  );
}
