/**
 * Every shipped image is a real product photo from public/products/, made from the originals in product-photos/
 * by scripts/product-photos.mts (npm run photos). Photos the owner uploads from the admin are kept as they are.
 * Older saved paths (generated mockups and scenes, in carts, order snapshots or settings) map to the photos.
 */
export const PHOTOS = '/products';

/** Photo folder per product, and the colours photographed. */
export const PHOTO_PRODUCTS: Record<string, string[]> = { 'short-sleeve': ['black', 'white'], sleeveless: ['black', 'white'] };
/** Which product's photos a category uses (for a product created in the admin before its own photos are uploaded). */
export const CATEGORY_PRODUCT: Record<string, string> = { 't-shirts': 'short-sleeve', sleeveless: 'sleeveless' };
/** Earlier generated garment types → the product folder that replaces them. */
const LEGACY_TYPE: Record<string, string> = {
  'tee-a': 'short-sleeve', 'tee-b': 'short-sleeve', tank: 'sleeveless', stringer: 'sleeveless',
  shorts: 'short-sleeve', shorts2: 'short-sleeve', socks: 'short-sleeve', cap: 'short-sleeve', towel: 'short-sleeve', bag: 'short-sleeve',
};
/** Earlier colours shown as the nearest photographed one. */
const LIGHT_COLOURS = new Set(['white', 'bone', 'silver', 'sand', 'stone']);

export const BANNERS = {
  hero: `${PHOTOS}/banners/hero.webp`, shop: `${PHOTOS}/banners/shop.webp`, og: `${PHOTOS}/banners/og.webp`,
  shortSleeve: `${PHOTOS}/banners/short-sleeve.webp`, sleeveless: `${PHOTOS}/banners/sleeveless.webp`,
};
/** Shown for a colour added in the admin until its photos are uploaded: the logo on black. */
export const PLACEHOLDER = `${PHOTOS}/placeholder.webp`;

export const photo = (product: string, colour: string, view: 'front' | 'back' = 'front') => `${PHOTOS}/${product}/${colour}-${view}.webp`;
/** Homepage gallery default. */
export const DEFAULT_COMMUNITY = [
  photo('short-sleeve', 'black'), photo('sleeveless', 'white'), photo('short-sleeve', 'white'),
  photo('sleeveless', 'black'), photo('short-sleeve', 'black', 'back'), photo('sleeveless', 'white', 'back'),
];

/** Front and back photos for one product colour, or the placeholder when that colour has no photos yet. */
export function photosFor(product: string, colourId: string): string[] {
  return (PHOTO_PRODUCTS[product] ?? []).includes(colourId) ? [photo(product, colourId, 'front'), photo(product, colourId, 'back')] : [PLACEHOLDER];
}

const PHOTO_RE = /^\/products\/([a-z-]+)\/([a-z]+)-(front|back)\.webp$/;
const LEGACY_RE = /^\/images\/(?:mockups|scenes|scenes-v\d+)\/(.+)-([a-z]+)-(front|back)\.webp$/;
const LEGACY_LIVE_RE = /^\/api\/scene\/([a-z-]+)\/[a-z0-9-]+\/([0-9a-f]{6})\/(front|back|og)(?:-v\d+)?\.webp$/;
const LEGACY_OLD_RE = /^\/images\/products\/(tee-a|tee-b|tank|stringer|shorts2|shorts|socks|cap|towel|bag)-([a-z]+)-(p?\d)\.webp$/;

/** A generated image from before the real photos (mockups, scenes, the on-demand scene route). */
const isLegacy = (src: string) => src.startsWith('/images/') || src.startsWith('/api/scene/');
/** A real photo (shipped in public/products/ or uploaded by the owner), as opposed to a generated image or the placeholder. */
export const isOwnPhoto = (src: string) => !!src && !isLegacy(src) && !src.startsWith('/brand/') && src !== PLACEHOLDER;

/** The product folder a photo (or an older generated image) belongs to, e.g. "short-sleeve". */
export function photoProduct(src: string): string | null {
  const m = PHOTO_RE.exec(src);
  if (m) return m[1];
  const t = (LEGACY_RE.exec(src) ?? LEGACY_LIVE_RE.exec(src) ?? LEGACY_OLD_RE.exec(src))?.[1];
  return t ? LEGACY_TYPE[t] ?? 'short-sleeve' : null;
}

const lightHex = (hex: string) => {
  const n = parseInt(hex.slice(0, 6), 16);
  return 0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 150;
};

/** Maps any older generated image to the matching real photo. Real photos and uploads pass through unchanged. */
export function cleanImage(src: string): string {
  if (!src || !isLegacy(src)) return src;
  let m = LEGACY_RE.exec(src);
  if (m) return photo(LEGACY_TYPE[m[1]] ?? 'short-sleeve', LIGHT_COLOURS.has(m[2]) ? 'white' : 'black', m[3] as 'front' | 'back');
  m = LEGACY_LIVE_RE.exec(src);
  if (m) return photo(LEGACY_TYPE[m[1]] ?? 'short-sleeve', lightHex(m[2]) ? 'white' : 'black', m[3] === 'back' ? 'back' : 'front');
  m = LEGACY_OLD_RE.exec(src);
  if (m) return photo(LEGACY_TYPE[m[1]] ?? 'short-sleeve', LIGHT_COLOURS.has(m[2]) ? 'white' : 'black', m[3] === '1' || m[3] === 'p1' ? 'front' : 'back');
  if (/scene-tees|tees/.test(src)) return BANNERS.shortSleeve;
  if (/sleeveless/.test(src)) return BANNERS.sleeveless;
  if (/hero/.test(src)) return BANNERS.hero;
  return BANNERS.shop;
}

/** For images saved earlier (carts in the browser, order snapshots): always a real file, never a broken box. */
export const displayImage = (src?: string | null) => (src ? cleanImage(src) : PLACEHOLDER);

/** The 1200 x 630 social-sharing (Open Graph) image for a product photo. */
export function ogImage(src?: string | null): string {
  if (!src) return BANNERS.og;
  const m = PHOTO_RE.exec(cleanImage(src));
  return m ? `${PHOTOS}/${m[1]}/${m[2]}-og.webp` : src;
}
