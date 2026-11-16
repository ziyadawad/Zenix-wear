'use client';
import type { DashLang } from '@/lib/dashboard/lang';
import { switchDashLang } from './i18n';

/** Language switch, same as the store's: shows the other language and switches to it (saved in a cookie). */
export function LangToggle({ lang }: { lang: DashLang }) {
  const other = lang === 'ar' ? 'en' : 'ar';
  return (
    <button type="button" lang={other} onClick={() => switchDashLang(other)} aria-label={other === 'en' ? 'حوّل للإنجليزي' : 'Switch to Arabic'}
      className="dash-pill font-medium tracking-wider">
      {other === 'en' ? 'EN' : 'العربية'}
    </button>
  );
}
