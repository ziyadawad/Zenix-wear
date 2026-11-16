/**
 * Every shipped image is an "ambient light" product scene from public/images/scenes/, rendered by
 * scripts/render-scenes.mts (npm run scenes), unless the owner uploads a real photo from the admin, which then
 * takes its place. A colour added from the admin that was not pre-rendered is drawn on demand by /api/scene.
 */
import { neonFor } from '../../../config/scene.config';
import { SCENE_COLOURS, SWATCH } from '../scene/colours';

export const MOCKUPS = '/images/scenes';
/** Where the first version of the mockups lived. Saved references are rewritten to MOCKUPS. */
const OLD_MOCKUPS = '/images/mockups';

/** tee-a = short-sleeve T-shirt, tank = sleeveless T-shirt. The only two products for now. */
export const MOCKUP_TYPES: Record<string, string[]> = { 'tee-a': SCENE_COLOURS, tank: SCENE_COLOURS };
/** Default mockup for a product category (admin-created products). A new category gets the short-sleeve tee. */
export const CATEGORY_MOCKUP: Record<string, string> = { 't-shirts': 'tee-a', sleeveless: 'tank' };
/** Removed garment types and the one that takes their place, so old order snapshots never show a broken image. */
const RETIRED: Record<string, string> = { 'tee-b': 'tee-a', stringer: 'tank', shorts: 'tee-a', shorts2: 'tee-a', socks: 'tee-a', cap: 'tee-a', towel: 'tee-a', bag: 'tee-a' };

export const SCENES = {
  hero: `${MOCKUPS}/hero.webp`, tees: `${MOCKUPS}/scene-tees.webp`, sleeveless: `${MOCKUPS}/scene-sleeveless.webp`, all: `${MOCKUPS}/scene-all.webp`,
  og: `${MOCKUPS}/og-home.webp`,
};
/** Homepage gallery default: both products in every starter colour. */
export const DEFAULT_COMMUNITY = ['tee-a:black', 'tank:white', 'tee-a:gray', 'tank:black', 'tee-a:white', 'tank:gray'].map((s) => `${MOCKUPS}/${s.replace(':', '-')}-front.webp`);
export const mockup = (type: string, colour: string, view: 'front' | 'back' = 'front') => `${MOCKUPS}/${type}-${colour}-${view}.webp`;
/** A scene drawn on demand, for a colour that is not pre-rendered (its neon is DEFAULT_NEON unless listed in the config). */
export const liveScene = (type: string, colourId: string, hex: string, view: 'front' | 'back' | 'og' = 'front') =>
  `/api/scene/${type}/${colourId}/${hex.replace('#', '').toLowerCase().slice(0, 6)}/${view}.webp`;

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
/** The rendered colour for a colour id, or the nearest one by swatch. */
export function mockupColour(type: string, colourId: string, hex?: string) {
  const available = MOCKUP_TYPES[type] ?? SCENE_COLOURS;
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
const SAFE_ID = /^[a-z0-9-]{1,80}$/;
/** Front and back scenes for one product colour: pre-rendered when available, else drawn on demand in its own colour. */
export function mockupsFor(type: string, colourId: string, hex?: string) {
  if ((MOCKUP_TYPES[type] ?? []).includes(colourId) || !hex || !/^#?[0-9a-f]{6}$/i.test(hex) || !SAFE_ID.test(colourId)) {
    const c = mockupColour(type, colourId, hex);
    return [mockup(type, c, 'front'), mockup(type, c, 'back')];
  }
  return [liveScene(type, colourId, hex, 'front'), liveScene(type, colourId, hex, 'back')];
}

const STATIC_RE = /^\/images\/scenes\/(.+)-([a-z]+)-(front|back)\.webp$/;
const LIVE_RE = /^\/api\/scene\/([a-z-]+)\/([a-z0-9-]+)\/([0-9a-f]{6})\/(front|back|og)\.webp$/;

/** What a scene image shows: garment type, colour id and its neon colour. Null for the owner's own photos. */
export function sceneInfo(src?: string | null): { type: string; colourId: string; neon: string } | null {
  if (!src) return null;
  const m = STATIC_RE.exec(src) ?? LIVE_RE.exec(src);
  return m ? { type: m[1], colourId: m[2], neon: neonFor(m[2]) } : null;
}
/** The 1200 x 630 social-sharing version of a product image. */
export function ogImage(src?: string | null): string {
  if (!src) return SCENES.og;
  const live = LIVE_RE.exec(src);
  if (live) return `/api/scene/${live[1]}/${live[2]}/${live[3]}/og.webp`;
  const m = STATIC_RE.exec(src);
  return m ? `${MOCKUPS}/og-${m[1]}-${m[2]}.webp` : src;
}

/** An image the owner uploaded (or linked), as opposed to one shipped with the site. */
export const isOwnPhoto = (src: string) => !src.startsWith('/images/') && !src.startsWith('/brand/') && !src.startsWith('/api/scene/');

/** The mockup type of a mockup path, e.g. "tee-a" for /images/mockups/tee-a-black-front.webp. */
export function mockupType(src: string): string | null {
  const t = (STATIC_RE.exec(src) ?? LIVE_RE.exec(src) ?? /^\/images\/mockups\/(.+)-[a-z]+-(front|back)\.webp$/.exec(src))?.[1] ?? null;
  return t && (MOCKUP_TYPES[t] ? t : RETIRED[t] ?? 'tee-a');
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
  if (!src || isOwnPhoto(src) || LIVE_RE.test(src)) return src;
  if (src.startsWith(`${OLD_MOCKUPS}/`)) src = MOCKUPS + src.slice(OLD_MOCKUPS.length);
  const m = STATIC_RE.exec(src);
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
