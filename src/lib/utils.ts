import { SIZES, type Locale, type Product } from './types';

export const CONTACT = {
  phone: '01003965158',
  phoneIntl: '+201003965158',
  whatsappUrl: 'https://wa.me/201003965158',
  email: 'ziyadawad14@gmail.com',
};

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

/** Arabic keyboards type ٠١٢٣ / ۰۱۲۳ digits; always normalise before validating phone numbers. */
export function toLatinDigits(s: string) {
  return s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
}
export function normalizePhone(s: string) {
  let v = toLatinDigits(s).replace(/[\s\-()]/g, '');
  if (v.startsWith('+2')) v = v.slice(2);
  else if (v.startsWith('002')) v = v.slice(3);
  return v;
}
/** Egyptian mobile: 010, 011, 012 or 015 followed by 8 digits. */
export const EG_PHONE = /^01[0125][0-9]{8}$/;
export const isEgPhone = (s: string) => EG_PHONE.test(normalizePhone(s));

export function formatMoney(v: number, locale: Locale) {
  const n = new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG', { maximumFractionDigits: 0 }).format(v);
  return locale === 'ar' ? `${n} ج.م` : `${n} EGP`;
}
export function formatNumber(v: number, locale: Locale) {
  return new Intl.NumberFormat(locale === 'ar' ? 'ar-EG' : 'en-EG').format(v);
}
export function formatDate(iso: string, locale: Locale, withTime = false) {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Cairo',
    ...(withTime ? { hour: 'numeric', minute: '2-digit' } : {}),
  }).format(new Date(iso));
}

export const effectivePrice = (p: Pick<Product, 'price' | 'salePrice'>) =>
  p.salePrice != null && p.salePrice < p.price ? p.salePrice : p.price;
export const discountPercent = (p: Pick<Product, 'price' | 'salePrice'>) =>
  p.salePrice != null && p.salePrice < p.price ? Math.round((1 - p.salePrice / p.price) * 100) : 0;

export const pName = (p: { nameAr: string; nameEn: string }, l: Locale) => (l === 'ar' ? p.nameAr : p.nameEn);
export const totalStock = (p: Pick<Product, 'variants'>) => p.variants.reduce((a, v) => a + v.stock, 0);
export const stockOf = (p: Pick<Product, 'variants'>, colorId: string, size: string) =>
  p.variants.find((v) => v.colorId === colorId && v.size === size)?.stock ?? 0;
/** Always XS to 3XL: the database returns rows in no fixed order. */
export const sortSizes = (sizes: Iterable<string>) => [...new Set(sizes)].sort((a, b) => (SIZES as readonly string[]).indexOf(a) - (SIZES as readonly string[]).indexOf(b));
export const sizesOf = (p: Pick<Product, 'variants'>) => sortSizes(p.variants.map((v) => v.size));

export function whatsappLink(text: string) {
  return `${CONTACT.whatsappUrl}?text=${encodeURIComponent(text)}`;
}
/** Local customer number (01xxxxxxxxx) to a wa.me chat link. */
export function customerWhatsapp(phone: string, text: string) {
  return `https://wa.me/2${normalizePhone(phone)}?text=${encodeURIComponent(text)}`;
}

export function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
}
/** Safe for dangerouslySetInnerHTML inside <script type="application/ld+json">. */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
