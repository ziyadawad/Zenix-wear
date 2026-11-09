'use client';
import { createContext, useContext, useMemo } from 'react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale, SiteSettings } from '@/lib/types';

export type PublicSettings = Pick<SiteSettings, 'freeShippingThreshold' | 'instagram' | 'tiktok' | 'facebook'>;
/** Categories shown in the menu, in order (Admin → Categories). */
export type MenuCategory = { slug: string; name: string };
interface Ctx { t: Dictionary; locale: Locale; lp: (p: string) => string; settings: PublicSettings; categories: MenuCategory[] }
const I18n = createContext<Ctx | null>(null);

export function I18nProvider({ dict, locale, settings, categories, children }: { dict: Dictionary; locale: Locale; settings: PublicSettings; categories: MenuCategory[]; children: React.ReactNode }) {
  const value = useMemo<Ctx>(() => ({ t: dict, locale, settings, categories, lp: (p) => `/${locale}${p === '/' ? '' : p}` }), [dict, locale, settings, categories]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}
export function useI18n() {
  const c = useContext(I18n);
  if (!c) throw new Error('useI18n must be used inside I18nProvider');
  return c;
}
export const fill = (s: string, v: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ''));
