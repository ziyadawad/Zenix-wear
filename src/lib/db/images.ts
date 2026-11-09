/**
 * Every image on the site is a product mockup (no people) from public/images/mockups/, rendered by
 * scripts/render-mockups.mjs, unless the owner uploads a real photo from the admin, which then takes its place.
 */
export const MOCKUPS = '/images/mockups';

/** Mockup types and the colours each was rendered in (keep in sync with the render script). */
const ALL = ['black', 'charcoal', 'graphite', 'gray', 'stone', 'bone', 'white', 'olive', 'navy', 'wine', 'silver', 'sand'];
/** tee-a = short-sleeve T-shirt, tank = sleeveless T-shirt. The only two products for now. */
export const MOCKUP_TYPES: Record<string, string[]> = { 'tee-a': ALL, tank: ALL };
/** Swatch colour of each mockup colour, to pick the closest one for a colour added in the admin. */
const SWATCH: Record<string, string> = {
  black: '#0d0d0d', charcoal: '#37383b', graphite: '#5c5e62', stone: '#96938c', bone: '#ded8ca', white: '#f4f4f4',
  olive: '#4a5038', navy: '#262f48', wine: '#561c26', silver: '#b2b4b8', sand: '#b09b7a', gray: '#85878d',
};
/** Default mockup for a product category (admin-created products). A new category gets the short-sleeve tee. */
export const CATEGORY_MOCKUP: Record<string, string> = { 't-shirts': 'tee-a', sleeveless: 'tank' };
/** Removed garment types and the one that takes their place, so old order snapshots never show a broken image. */
const RETIRED: Record<string, string> = { 'tee-b': 'tee-a', stringer: 'tank', shorts: 'tee-a', shorts2: 'tee-a', socks: 'tee-a', cap: 'tee-a', towel: 'tee-a', bag: 'tee-a' };

export const SCENES = {
  hero: `${MOCKUPS}/hero.webp`, tees: `${MOCKUPS}/scene-tees.webp`, sleeveless: `${MOCKUPS}/scene-sleeveless.webp`, all: `${MOCKUPS}/scene-all.webp`,
};
/** Homepage gallery default: both products in every starter colour. */
export const DEFAULT_COMMUNITY = ['tee-a:black', 'tank:white', 'tee-a:gray', 'tank:black', 'tee-a:white', 'tank:gray'].map((s) => `${MOCKUPS}/${s.replace(':', '-')}-front.webp`);
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
  if (!src || isOwnPhoto(src)) return src;
  const m = /^\/images\/mockups\/(.+)-([a-z]+)-(front|back)\.webp$/.exec(src);
  if (m) {
    if (MOCKUP_TYPES[m[1]]) return src;
    const type = RETIRED[m[1]] ?? 'tee-a';
    return mockup(type, mockupColour(type, m[2], SWATCH[m[2]]), m[3] as 'front' | 'back');
  }
  if (src.startsWith(`${MOCKUPS}/`)) return Object.values(SCENES).includes(src) ? src : SCENES.all;
  const p = /^\/images\/products\/(tee-a|tee-b|tank|stringer|shorts2|shorts|socks|cap|towel|bag)-([a-z]+)-(p?\d)\.webp$/.exec(src);
  if (p) {
    const type = MOCKUP_TYPES[p[1]] ? p[1] : RETIRED[p[1]] ?? 'tee-a';
    return mockup(type, mockupColour(type, p[2], SWATCH[p[2]]), p[3] === '1' || p[3] === 'p1' ? 'front' : 'back');
  }
  return SCENES.all;
}

/** For images saved before the switch (carts in the browser, order snapshots): always a real file, never a broken box. */
export const displayImage = (src?: string | null) => (src ? cleanImage(src) : mockup('tee-a', 'black'));
