// Dashboard language. One cookie, read by the server (html lang/dir, API texts) and by the client.
// No server-only imports here: the client components use it too.
export type DashLang = 'ar' | 'en';
export const DASH_LANG_COOKIE = 'zenix_dash_lang';
export const toDashLang = (v: string | undefined | null): DashLang => (v === 'en' ? 'en' : 'ar');

/** Picks the text for a language: tr(lang, 'عربي', 'English'). */
export const tr = (lang: DashLang, ar: string, en: string) => (lang === 'en' ? en : ar);
