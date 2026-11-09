import { DASH_LANG_COOKIE, type DashLang } from '@/lib/dashboard/lang';

/**
 * The dashboard's current language. Set once by the app shell from the cookie before anything renders;
 * every label and formatter reads it. Switching reloads the page, so it never changes mid-render.
 */
let current: DashLang = 'ar';
export const setDashLang = (l: DashLang) => { current = l; };
export const dashLang = () => current;
/** L('عربي', 'English') */
export const L = (ar: string, en: string) => (current === 'en' ? en : ar);
export const intlLocale = () => (current === 'en' ? 'en-GB' : 'ar-EG');

export function switchDashLang(l: DashLang) {
  document.cookie = `${DASH_LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}
