import type { Locale, SiteSettings } from '@/lib/types';
import { cx } from '@/lib/utils';

const ICONS = {
  instagram: <path d="M12 7.5A4.500 4.500 0 1 0 12 16.500 4.500 4.500 0 0 0 12 7.500zM3.500 8A4.500 4.500 0 0 1 8 3.500h8A4.500 4.500 0 0 1 20.500 8v8a4.500 4.500 0 0 1-4.500 4.500H8A4.500 4.500 0 0 1 3.500 16V8zM17 6.800v.1" fill="none" stroke="currentColor" strokeWidth="1.25" />,
  tiktok: <path d="M14 3.500v11.700a3.300 3.300 0 1 1-3.300-3.300M14 3.500c.3 2.600 2.100 4.400 4.900 4.700" fill="none" stroke="currentColor" strokeWidth="1.25" />,
  facebook: <path d="M14 21v-8h2.800l.5-3.300H14V7.800c0-1 .4-1.700 1.800-1.700h1.600V3.200A20 20 0 0 0 15 3c-2.500 0-4.200 1.500-4.200 4.300v2.400H8V13h2.800v8" fill="none" stroke="currentColor" strokeWidth="1.25" />,
};

/** Shows every network. Until a link is added in admin, the icon goes to the contact page instead of a dead link. */
export function SocialLinks({ settings, locale, className }: { settings: Pick<SiteSettings, 'instagram' | 'tiktok' | 'facebook'>; locale: Locale; className?: string }) {
  return (
    <div className={cx('flex', className)}>
      {(['instagram', 'tiktok', 'facebook'] as const).map((k) => {
        const url = settings[k];
        return (
          <a key={k} href={url || `/${locale}/contact`} aria-label={k} {...(url ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="icon-btn text-muted hover:text-white">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">{ICONS[k]}</svg>
          </a>
        );
      })}
    </div>
  );
}
