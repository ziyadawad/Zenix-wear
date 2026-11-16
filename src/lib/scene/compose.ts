/**
 * ProductScene, the image side: an "ambient light" night studio built as layered SVG.
 *
 *   1. background + coloured backlight      4. garment (back layer, fabric, folds, bands, stitching, Z print)
 *   2. smoky haze (fractal noise)           5. neutral backlight halo around dark garments (never tinted)
 *   3. diagonal neon beam from top-left     6. wet, glossy floor: mirrored garment, beam reflection, glints
 *                                           7. the silver ZENIX logo in the top corner
 *
 * The neon colour lives only in the background (beam, haze, backlight, floor): the garment itself is lit with
 * neutral white studio light, so it always shows its true colour.
 *
 * Pure string building, no Node or browser APIs: `npm run scenes` renders it to WebP files and
 * /api/scene renders it on demand for colours added from the admin. The page-side layers (hover glow,
 * colour fade) are in src/components/product/ProductScene.tsx.
 */
import { DEFAULT_NEON, LIGHT_GARMENT_THRESHOLD, PIPING, PIPING_ON_DARK, PIPING_ON_LIGHT } from '../../../config/scene.config';
import { FLOOR, garment, type GarmentType, type View } from './garments';

export { FLOOR };
export const SCENE_W = 1200, SCENE_H = 1500;
export const OG_W = 1200, OG_H = 630;

/** Images the scene embeds, as data URIs (made from the real logo files by scripts/render-scenes.ts). */
export interface SceneAssets {
  logo: string; logoW: number; logoH: number;
  /** The Z printed on the garment: light version for dark fabric, dark version for light fabric. */
  z: string; zDark: string; zW: number; zH: number;
}

/** Fabric tones per rendered colour id (a little lifted for the darkest, so folds still read). */
export const TONES: Record<string, string> = {
  black: '#2b2b2f', charcoal: '#3a3b3f', graphite: '#5d5f63', stone: '#9a978f', bone: '#dcd6c8', white: '#f3f3f3',
  olive: '#4d5439', navy: '#27304a', wine: '#5a1d28', silver: '#b4b6ba', sand: '#b39e7c', gray: '#85878d',
};

// ---- Colour helpers -------------------------------------------------------------------------------------------
const rgb = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt((h.length === 3 ? h.split('').map((c) => c + c).join('') : h.padEnd(6, '0')).slice(0, 6), 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
};
const toHex = (c: number[]) => `#${c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
export const mix = (a: string, b: string, t: number) => { const x = rgb(a), y = rgb(b); return toHex(x.map((v, i) => v + (y[i] - v) * t)); };
export const shade = (hex: string, f: number) => toHex(rgb(hex).map((v) => (f >= 0 ? v + (255 - v) * f : v * (1 + f))));
/** Perceived lightness, 0 (black) to 1 (white): CIE L* / 100. */
export function lightness(hex: string) {
  const [r, g, b] = rgb(hex).map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return (y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y) / 100;
}
export const isLightGarment = (hex: string) => lightness(hex) > LIGHT_GARMENT_THRESHOLD;
/** The fabric tone for a colour: the tuned tone for rendered colours, else the swatch, lifted when near black. */
export function fabricTone(colourId: string, hex: string) {
  if (TONES[colourId]) return TONES[colourId];
  const l = lightness(hex);
  return l < 0.18 ? mix(hex, '#ffffff', 0.13) : l > 0.94 ? mix(hex, '#000000', 0.04) : hex;
}

/** Piping colour of the short-sleeve tee for a garment colour (config/scene.config.ts). */
export const pipingFor = (colourId: string, hex: string) => PIPING[colourId] ?? (isLightGarment(hex) ? PIPING_ON_LIGHT : PIPING_ON_DARK);

/** Small seeded random, so every render of a scene is identical. */
function rand(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const f = (n: number) => Math.round(n * 10) / 10;

// ---- Scene ----------------------------------------------------------------------------------------------------
export interface SceneItem {
  type: GarmentType; view: View;
  /** Swatch colour (decides light or dark treatment) and fabric tone. */
  hex: string; tone: string; neon: string;
  /** Contrast piping colour (short-sleeve tee). */
  piping: string;
  /** Placement of the 1200 x 1500 garment canvas in the scene. */
  x: number; y: number; s: number;
}
export interface SceneOptions {
  w: number; h: number; items: SceneItem[]; assets: SceneAssets;
  /** Colour of the beam and haze. Defaults to the first item's neon. */
  neon?: string;
  /** Logo top-left and width, or null for none. */
  logo?: { x: number; y: number; w: number } | null;
  seed?: number;
}

/** Strength of each layer: light garments sit in a near-black scene, dark garments in a glowing one. */
function mood(light: boolean) {
  return light
    ? { bg: '#030305', ambient: 0.05, back: 0.12, haze: 0.2, halo: 0.2, beam: 0.5, core: 0.62, coreWhite: 0, sep: 0, floorGlow: 0.12, refl: 0.3 }
    : { bg: '#07080d', ambient: 0.14, back: 0.8, haze: 0.55, halo: 0.42, beam: 0.9, core: 0.95, coreWhite: 0.55, sep: 0.42, floorGlow: 0.3, refl: 0.42 };
}

function garmentDefs(p: string, it: SceneItem, light: boolean, a: SceneAssets) {
  const g = garment(it.type, it.view);
  const base = it.tone;
  const dark = shade(base, light ? -0.3 : -0.42), mid = shade(base, light ? -0.1 : -0.16), hi = shade(base, light ? 0.18 : 0.2);
  const inside = shade(base, light ? -0.2 : -0.32);
  const stitchColour = light ? shade(base, -0.32) : shade(base, 0.3);
  const W = 1200, H = 1500;
  let n = 0;
  const offsetLine = (d: string, dist: number, colour: string, o: number, dash = '') => {
    const id = `${p}m${n++}`;
    return `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><path d="${d}" fill="none" stroke="#fff" stroke-width="${dist * 2 + 2.6}"${dash ? ` stroke-dasharray="${dash}"` : ''}/><path d="${d}" fill="none" stroke="#000" stroke-width="${dist * 2 - 2.6}"/></mask><rect width="${W}" height="${H}" fill="${colour}" opacity="${o}" mask="url(#${id})"/>`;
  };
  const band = (b: (typeof g.bands)[number]) => {
    const c = shade(base, b.tone ?? -0.06);
    return `<path d="${b.d}" fill="none" stroke="${c}" stroke-width="${b.w * 2}"/>`
      + (b.rib ? `<path d="${b.d}" fill="none" stroke="#000" stroke-opacity="${light ? 0.12 : 0.28}" stroke-width="${b.w * 2}" stroke-dasharray="2.2 4.6"/>` : '')
      + offsetLine(b.d, b.w, '#000', light ? 0.22 : 0.4)
      + offsetLine(b.d, b.w + 2.5, '#fff', light ? 0.25 : 0.08);
  };
  const outer = g.bands.filter((b) => !b.inner), inner = g.bands.filter((b) => b.inner);
  const shadows = g.folds.filter((x) => !x.light), lights = g.folds.filter((x) => x.light);
  const zW = g.print?.w ?? 0, zH = (zW * a.zH) / a.zW;
  // The piping: a thin contrast cord with a soft shadow beside it, so it reads as sewn in.
  const pipe = (pp: (typeof g.piping)[number]) => pp.dist
    ? offsetLine(pp.d, pp.dist + 3, '#000', light ? 0.18 : 0.35) + offsetLine(pp.d, pp.dist, it.piping, 1)
    : `<path d="${pp.d}" fill="none" stroke="#000" stroke-width="9" opacity="${light ? 0.15 : 0.35}" transform="translate(2 3)"/><path d="${pp.d}" fill="none" stroke="${it.piping}" stroke-width="5" stroke-linecap="round"/><path d="${pp.d}" fill="none" stroke="#fff" stroke-width="1.4" opacity=".22" transform="translate(-1 -1)"/>`;
  return `
  <linearGradient id="${p}side" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".2" stop-color="${mid}"/><stop offset=".46" stop-color="${base}"/><stop offset=".78" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
  <radialGradient id="${p}hi" cx=".34" cy=".24" r=".62"><stop offset="0" stop-color="${hi}" stop-opacity=".7"/><stop offset=".6" stop-color="${hi}" stop-opacity=".12"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${p}diag" x1="0" y1="0" x2="1" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${light ? 0.22 : 0.38}"/></linearGradient>
  <linearGradient id="${p}inside" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${inside}"/><stop offset=".3" stop-color="${shade(inside, -0.15)}"/></linearGradient>
  <clipPath id="${p}clip"><path d="${g.body}"/></clipPath>
  <clipPath id="${p}bclip"><path d="${g.back}"/></clipPath>
  <filter id="${p}fold" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="13"/></filter>
  <filter id="${p}fold2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="${p}cloth" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency=".85 .55" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  0.9 0 0 0 -0.32"/></filter>
  <filter id="${p}wash" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency=".012 .02" numOctaves="3" seed="9"/><feColorMatrix values="0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  0 0 0 0 ${light ? 0 : 1}  1.4 0 0 0 -0.62"/></filter>
  <g id="${p}g">
    <path d="${g.back}" fill="url(#${p}inside)"/>
    <g clip-path="url(#${p}bclip)">${inner.map(band).join('')}</g>
    <path d="${g.body}" fill="url(#${p}side)"/>
    <g clip-path="url(#${p}clip)">
      ${g.panels.map((d) => `<path d="${d}" fill="#000" opacity=".07"/>`).join('')}
      <rect width="${W}" height="${H}" fill="url(#${p}hi)"/>
      <rect width="${W}" height="${H}" fill="url(#${p}diag)"/>
      <rect width="${W}" height="${H}" filter="url(#${p}cloth)" opacity="${light ? 0.35 : 0.22}"/>
      <g filter="url(#${p}fold)" fill="none" stroke-linecap="round">${shadows.map((x) => `<path d="${x.d}" stroke="#000" stroke-width="${x.w * 1.6}" opacity="${f(x.o * (light ? 0.2 : 0.55))}"/>`).join('')}</g>
      <g filter="url(#${p}fold2)" fill="none" stroke-linecap="round">${shadows.map((x) => `<path d="${x.d}" stroke="#000" stroke-width="${x.w * 0.35}" opacity="${f(x.o * (light ? 0.08 : 0.25))}"/>`).join('')}</g>
      <g filter="url(#${p}fold)" fill="none" stroke-linecap="round">${lights.map((x) => `<path d="${x.d}" stroke="#fff" stroke-width="${x.w * 1.4}" opacity="${f(x.o * (light ? 0.5 : 0.24))}"/>`).join('')}</g>
      ${g.seams.map((d) => `<path d="${d}" fill="none" stroke="#000" stroke-width="3" opacity="${light ? 0.25 : 0.5}"/><path d="${d}" transform="translate(-4 0)" fill="none" stroke="#fff" stroke-width="2" opacity="${light ? 0.35 : 0.1}"/>`).join('')}
      ${g.washed ? `<rect width="${W}" height="${H}" filter="url(#${p}wash)" opacity="${light ? 0.07 : 0.06}"/>` : ''}
      ${outer.map(band).join('')}
      ${g.piping.map(pipe).join('')}
      ${g.stitches.map((s) => offsetLine(s.d, s.dist, stitchColour, 0.75, '8 6')).join('')}
    </g>
    ${g.print ? `<image href="${light ? a.zDark : a.z}" x="${g.print.x}" y="${g.print.y}" width="${zW}" height="${f(zH)}" opacity=".95"/>` : ''}
    <path d="${g.body}" fill="none" stroke="${light ? '#000' : '#fff'}" stroke-opacity="${light ? 0.12 : 0.08}" stroke-width="2"/>
  </g>`;
}

/** The coloured backlight behind one garment. Drawn for every item before any garment, so it never covers one. */
const backlight = (p: string, it: SceneItem) => `<rect x="${f(it.x - 200 * it.s)}" y="${f(it.y)}" width="${f(1600 * it.s)}" height="${f(1500 * it.s)}" fill="url(#${p}bl)"/>`;

/**
 * One garment with its floor reflection, in garment canvas coordinates. Dark garments get a soft neutral white
 * halo behind their outline (it sits behind the shirt, so the fabric keeps its true colour).
 */
function garmentLayers(p: string, it: SceneItem, light: boolean): { defs: string; layers: string } {
  const m = mood(light);
  const body = garment(it.type, it.view).body;
  const neon = it.neon;
  const defs = `
    <radialGradient id="${p}bl" cx="${f(it.x + 600 * it.s)}" cy="${f(it.y + 740 * it.s)}" r="${f(620 * it.s)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${mix(neon, '#ffffff', 0.7)}" stop-opacity="${m.back}"/><stop offset=".45" stop-color="${mix(neon, '#ffffff', 0.35)}" stop-opacity="${f(m.back * 0.5)}"/><stop offset="1" stop-color="${neon}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${p}rf" x1="0" y1="${FLOOR}" x2="0" y2="${FLOOR + 300}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="${m.refl}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <mask id="${p}rm" maskUnits="userSpaceOnUse" x="0" y="${FLOOR}" width="1200" height="320"><rect x="0" y="${FLOOR}" width="1200" height="320" fill="url(#${p}rf)"/></mask>
    <filter id="${p}b2" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.5"/></filter>
    <filter id="${p}b9" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
    <filter id="${p}b24" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="24"/></filter>
`;
  const layers = `<g transform="translate(${it.x} ${it.y}) scale(${it.s})">
    <g mask="url(#${p}rm)"><use href="#${p}g" transform="translate(0 ${FLOOR * 2}) scale(1 -1)" filter="url(#${p}b2)"/></g>
    <ellipse cx="600" cy="${FLOOR + 4}" rx="300" ry="16" fill="#000" opacity=".75" filter="url(#${p}b9)"/>
    ${m.sep ? `<path d="${body}" fill="none" stroke="#ffffff" stroke-width="40" opacity="${m.sep}" filter="url(#${p}b24)"/>` : ''}
    <use href="#${p}g"/>
  </g>`;
  return { defs, layers };
}

/** The full scene as an SVG string. */
export function sceneSvg(o: SceneOptions): string {
  const { w, h, items, assets } = o;
  const light = items.every((it) => isLightGarment(it.hex));
  const m = mood(light);
  const neon = o.neon ?? items[0]?.neon ?? DEFAULT_NEON;
  const floorY = Math.max(...items.map((it) => it.y + FLOOR * it.s));
  const r = rand(o.seed ?? 11);
  const haze = mix(neon, '#9aa3b5', 0.45);
  // The beam: from the top-left corner, diagonally down to the right, fading as it goes.
  const bx1 = -0.06 * w, by1 = 0.035 * h, bx2 = 1.08 * w, by2 = 0.82 * h;
  const bw = Math.min(w, h * 1.2) / 1200; // beam thickness scale
  const core = m.coreWhite ? mix(neon, '#ffffff', m.coreWhite) : neon;
  const glints = Array.from({ length: Math.round(w / 70) }, () => {
    const x = r() * w, y = floorY + 14 + r() ** 1.6 * (h - floorY - 20), rx = 4 + r() * 16;
    return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.22 + 1)}" fill="${r() > 0.75 ? mix(neon, '#fff', 0.5) : neon}" opacity="${f((0.25 + r() * 0.6) * (light ? 0.55 : 1))}"/>`;
  }).join('');
  const ripples = Array.from({ length: 7 }, () => {
    const y = floorY + 30 + r() * (h - floorY - 40), x = r() * w * 0.8, len = w * (0.15 + r() * 0.35);
    return `<path d="M${f(x)} ${f(y)} h${f(len)}" stroke="${neon}" stroke-width="1.6" opacity="${f(0.1 + r() * 0.16)}"/>`;
  }).join('');
  const logo = o.logo ?? null;
  const garments = items.map((it, i) => garmentLayers(`i${i}`, it, isLightGarment(it.hex)));

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
<defs>
  ${items.map((it, i) => garmentDefs(`i${i}`, it, isLightGarment(it.hex), assets)).join('')}
  ${garments.map((g) => g.defs).join('')}
  <radialGradient id="amb" cx=".5" cy=".46" r=".7"><stop offset="0" stop-color="${neon}" stop-opacity="${m.ambient}"/><stop offset="1" stop-color="${neon}" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx=".5" cy=".45" r=".78"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".72"/></radialGradient>
  <filter id="haze" x="0" y="0" width="${w}" height="${h}" filterUnits="userSpaceOnUse"><feTurbulence type="fractalNoise" baseFrequency="${(2.6 / Math.max(w, h)).toFixed(5)} ${(4.6 / Math.max(w, h)).toFixed(5)}" numOctaves="4" seed="7"/><feColorMatrix values="0 0 0 0 ${(rgb(haze)[0] / 255).toFixed(3)}  0 0 0 0 ${(rgb(haze)[1] / 255).toFixed(3)}  0 0 0 0 ${(rgb(haze)[2] / 255).toFixed(3)}  2.3 0 0 0 -0.8"/><feGaussianBlur stdDeviation="${f(10 * bw)}"/></filter>
  <linearGradient id="hazeMask" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity="1"/><stop offset="${f(floorY / h * 100) / 100}" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity=".25"/></linearGradient>
  <mask id="hm" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="url(#hazeMask)"/></mask>
  <linearGradient id="beamG" x1="${f(bx1)}" y1="${f(by1)}" x2="${f(bx2)}" y2="${f(by2)}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity=".12"/></linearGradient>
  <mask id="beamM" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="url(#beamG)"/></mask>
  <filter id="bk3" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${f(3 * bw)}"/></filter>
  <filter id="bk18" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f(18 * bw)}"/></filter>
  <filter id="bk70" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="${f(70 * bw)}"/></filter>
  <filter id="gl" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="${f(2.5 * bw)}"/></filter>
  <g id="beam" mask="url(#beamM)">
    <polygon points="${f(-0.02 * w)},0 ${f(0.3 * w)},0 ${f(1.02 * w)},${f(0.62 * h)} ${f(0.92 * w)},${f(0.98 * h)}" fill="${neon}" opacity="${f(m.halo * 0.35)}" filter="url(#bk70)"/>
    <line x1="${f(bx1)}" y1="${f(by1)}" x2="${f(bx2)}" y2="${f(by2)}" stroke="${neon}" stroke-width="${f(220 * bw)}" opacity="${m.halo}" filter="url(#bk70)"/>
    <line x1="${f(bx1)}" y1="${f(by1)}" x2="${f(bx2)}" y2="${f(by2)}" stroke="${neon}" stroke-width="${f(50 * bw)}" opacity="${m.beam}" filter="url(#bk18)"/>
    <line x1="${f(bx1)}" y1="${f(by1)}" x2="${f(bx2)}" y2="${f(by2)}" stroke="${core}" stroke-width="${f(10 * bw)}" opacity="${m.core}" filter="url(#bk3)"/>
  </g>
  <linearGradient id="floorG" x1="0" y1="${f(floorY)}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${mix(m.bg, neon, light ? 0.04 : 0.1)}"/><stop offset=".35" stop-color="${m.bg}"/><stop offset="1" stop-color="#010102"/></linearGradient>
  <linearGradient id="flR" x1="0" y1="${f(floorY)}" x2="0" y2="${h}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".5"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="flM" maskUnits="userSpaceOnUse" x="0" y="${f(floorY)}" width="${w}" height="${f(h - floorY)}"><rect x="0" y="${f(floorY)}" width="${w}" height="${f(h - floorY)}" fill="url(#flR)"/></mask>
</defs>
<rect width="${w}" height="${h}" fill="${m.bg}"/>
<rect width="${w}" height="${h}" fill="url(#amb)"/>
<g mask="url(#hm)" opacity="${m.haze}"><rect width="${w}" height="${h}" filter="url(#haze)"/></g>
<use href="#beam"/>
<rect x="0" y="${f(floorY)}" width="${w}" height="${f(h - floorY)}" fill="url(#floorG)"/>
<g mask="url(#flM)"><use href="#beam" transform="translate(0 ${f(floorY * 2)}) scale(1 -1)"/></g>
<line x1="0" y1="${f(floorY)}" x2="${w}" y2="${f(floorY)}" stroke="${neon}" stroke-width="${f(3 * bw)}" opacity="${light ? 0.12 : 0.3}" filter="url(#bk18)"/>
${items.map((it) => `<ellipse cx="${f(it.x + 600 * it.s)}" cy="${f(floorY + 50 * it.s)}" rx="${f(560 * it.s)}" ry="${f(80 * it.s)}" fill="${it.neon}" opacity="${m.floorGlow}" filter="url(#bk70)"/>`).join('')}
<g filter="url(#gl)">${glints}</g>
<g filter="url(#gl)">${ripples}</g>
${items.map((it, i) => backlight(`i${i}`, it)).join('')}
${garments.map((g) => g.layers).join('')}
<rect width="${w}" height="${h}" fill="url(#vig)"/>
${logo ? `<image href="${assets.logo}" x="${f(logo.x)}" y="${f(logo.y)}" width="${f(logo.w)}" height="${f((logo.w * assets.logoH) / assets.logoW)}" opacity=".95"/>` : ''}
</svg>`;
}

/** A single product's scene (the card, gallery, cart and wishlist image), 1200 x 1500. */
export function productSceneSvg(type: GarmentType, view: View, colourId: string, hex: string, neon: string, assets: SceneAssets) {
  return sceneSvg({
    w: SCENE_W, h: SCENE_H, assets, neon, seed: 11,
    // Scaled up so the garment fills most of the frame (it reads clearly in small cards), centred, whole.
    items: [{ type, view, hex, tone: fabricTone(colourId, hex), neon, piping: pipingFor(colourId, hex), x: -120, y: -164, s: 1.2 }],
    logo: { x: SCENE_W - 150 - 48, y: 48, w: 150 },
  });
}

/** The social-sharing (Open Graph) version, 1200 x 630: the garment on the right, the logo on the left. */
export function ogSceneSvg(type: GarmentType, colourId: string, hex: string, neon: string, assets: SceneAssets) {
  const s = 0.42;
  return sceneSvg({
    w: OG_W, h: OG_H, assets, neon, seed: 5,
    items: [{ type, view: 'front', hex, tone: fabricTone(colourId, hex), neon, piping: pipingFor(colourId, hex), x: 600, y: OG_H - 1500 * s + 20, s }],
    logo: { x: 110, y: 170, w: 360 },
  });
}
