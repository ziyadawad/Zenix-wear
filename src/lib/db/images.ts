/**
 * Photos of people were removed from the site. Old paths that may still be stored in the database
 * (products, orders, homepage content, collections, reviews) are mapped to product-only images here.
 * `null` means "no replacement": the caller drops the image (or uses the brand background).
 */
const REPLACED: Record<string, string | null> = {
  '/images/hero/figure-1.webp': null,
  '/images/hero/figure-2-studio.webp': '/images/editorial/rack.webp',
  '/images/hero/lineup.webp': '/images/products/tee-lineup.webp',
  '/images/editorial/seated.webp': '/images/editorial/dumbbells.webp',
  '/images/editorial/lift-hands.webp': '/images/editorial/gym-bw.webp',
  '/images/editorial/barbell-floor.webp': '/images/products/socks-black-1.webp',
};
/** The only editorial photos left: gym equipment, no people. */
const KEPT_EDITORIAL = new Set(['/images/editorial/gym-bw.webp', '/images/editorial/rack.webp', '/images/editorial/dumbbells.webp']);
/** Product renders deleted with the oversized line and the bone tank; nothing replaces them. */
const GONE_PRODUCT = /^\/images\/products\/(over-[a-z]+|tank-bone)-\d\.webp$/;
const OLD_TEE = /^\/images\/products\/tee-([ab])-([a-z]+)-([123])\.webp$/;

/** Returns the replacement for a removed image, `null` if it has none, or the same path if it was never removed. */
export function cleanImage(src: string): string | null {
  if (src in REPLACED) return REPLACED[src];
  const m = OLD_TEE.exec(src);
  if (m) return `/images/products/tee-${m[1]}-${m[2]}-${m[3] === '1' ? 'p1' : 'p2'}.webp`;
  // Any other hero or editorial photo from earlier versions of the site showed athletes.
  if (src.startsWith('/images/hero/')) return null;
  if (src.startsWith('/images/editorial/') && !KEPT_EDITORIAL.has(src)) return '/images/editorial/gym-bw.webp';
  if (GONE_PRODUCT.test(src)) return null;
  return src;
}

/** Cleans a list of images, dropping removed ones without a replacement and any duplicates. */
export function cleanImages(list: string[]): string[] {
  return [...new Set(list.map(cleanImage).filter((s): s is string => !!s))];
}
