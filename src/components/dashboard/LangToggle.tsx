'use client';
import type { DashLang } from '@/lib/dashboard/lang';
import { switchDashLang } from './i18n';

/** Language switch, same as the store's: shows the other language and switches to it (saved in a cookie). */
export function LangToggle({ lang }: { lang: DashLang }) {
  const other = lang === 'ar' ? 'en' : 'ar';
  return (
    <button type="button" lang={other} onClick={() => switchDashLang(other)} aria-label={other === 'en' ? 'حوّل للإنجليزي' : 'Switch to Arabic'}
      className="flex h-9 min-w-11 items-center justify-center rounded-full border border-line-strong px-3 text-[12px] font-medium tracking-wider transition-colors hover:border-white">
      {other === 'en' ? 'EN' : 'العربية'}
    </button>
  );
}
