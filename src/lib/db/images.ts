/**
 * Every image on the site is a product mockup (no people) from public/images/mockups/, rendered by
 * scripts/render-mockups.mjs, unless the owner uploads a real photo from the admin, which then takes its place.
 */
export const MOCKUPS = '/images/mockups';

/** Mockup types and the colours each was rendered in (keep in sync with the render script). */
const ALL = ['black', 'charcoal', 'graphite', 'stone', 'bone', 'white', 'olive', 'navy', 'wine', 'silver', 'sand'];
const DARK6 = ['black', 'charcoal', 'graphite', 'navy', 'olive', 'stone'];
export const MOCKUP_TYPES: Record<string, string[]> = {
  'tee-a': ALL, 'tee-b': ALL, tank: ALL, stringer: ALL, shorts: ALL, shorts2: ALL, socks: ALL, cap: ALL, towel: DARK6, bag: DARK6,
};
/** Swatch colour of each mockup colour, to pick the closest one for a colour added in the admin. */
const SWATCH: Record<string, string> = {
  black: '#0d0d0d', charcoal: '#37383b', graphite: '#5c5e62', stone: '#96938c', bone: '#ded8ca', white: '#f4f4f4',
  olive: '#4a5038', navy: '#262f48', wine: '#561c26', silver: '#b2b4b8', sand: '#b09b7a',
};
/** Default mockup for a product category (admin-created products). */
export const CATEGORY_MOCKUP: Record<string, string> = { 't-shirts': 'tee-a', tanks: 'tank', shorts: 'shorts', socks: 'socks', accessories: 'cap' };

export const SCENES = {
  hero: `${MOCKUPS}/hero.webp`, tees: `${MOCKUPS}/scene-tees.webp`, all: `${MOCKUPS}/scene-all.webp`,
  zen: `${MOCKUPS}/scene-zen.webp`, zenith: `${MOCKUPS}/scene-zenith.webp`, limited: `${MOCKUPS}/scene-limited.webp`,
};
export const mockup = (type: string, colour: string, view: 'front' | 'back' = 'front') => `${MOCKUPS}/${type}-${colour}-${view}.webp`;

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
/** The rendered colour for a colour id, or the nearest one by swatch. */
export function mockupColour(type: string, colourId: string, hex?: string) {
  const available = MOCKUP_TYPES[type] ?? ALL;
  if (available.includes(colourId)) return colourId;
  const [r, g, b] = rgb(hex ?? '#0d0d0d');
  let best = available[0], dist = Infinity;
  for (const c of available) {
    const [r2, g2, b2] = rgb(SWATCH[c]);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < dist) { dist = d; best = c; }
  }
  return best;
}
/** Front and back mockups for one product colour. */
export function mockupsFor(type: string, colourId: string, hex?: string) {
  const c = mockupColour(type, colourId, hex);
  return [mockup(type, c, 'front'), mockup(type, c, 'back')];
}

/** An image the owner uploaded (or linked), as opposed to one shipped with the site. */
export const isOwnPhoto = (src: string) => !src.startsWith('/images/') && !src.startsWith('/brand/');

/** The mockup type of a mockup path, e.g. "tee-a" for /images/mockups/tee-a-black-front.webp. */
export function mockupType(src: string): string | null {
  return /^\/images\/mockups\/(.+)-[a-z]+-(front|back)\.webp$/.exec(src)?.[1] ?? null;
}

/** Works out which mockup type an older shipped image belonged to, from its file name. */
export function typeFromOldImage(src: string): string | null {
  const m = /^\/images\/products\/(tee-a|tee-b|tank|stringer|shorts2|shorts|socks|cap|towel|bag)-/.exec(src);
  return m?.[1] ?? null;
}

/**
 * Maps any older shipped image (people photos, gym photos, the first product renders) to a mockup.
 * Mockups and the owner's own uploads pass through unchanged.
 */
export function cleanImage(src: string): string {
  if (!src || src.startsWith(`${MOCKUPS}/`) || isOwnPhoto(src)) return src;
  const p = /^\/images\/products\/(tee-a|tee-b|tank|stringer|shorts2|shorts|socks|cap|towel|bag)-([a-z]+)-(p?\d)\.webp$/.exec(src);
  if (p) return mockup(p[1], mockupColour(p[1], p[2]), p[3] === '1' || p[3] === 'p1' ? 'front' : 'back');
  if (src === '/images/products/tee-lineup.webp' || src.startsWith('/images/hero/lineup')) return SCENES.tees;
  if (src.startsWith('/images/editorial/dumbbells') || src.startsWith('/images/editorial/seated')) return SCENES.zen;
  if (src.startsWith('/images/editorial/rack') || src.startsWith('/images/hero/')) return SCENES.zenith;
  return SCENES.all;
}
