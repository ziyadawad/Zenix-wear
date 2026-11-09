// Renders every image on the site: flat product mockups (no people) on the dark ZENIX background,
// with the Z printed on them, in every colour, front and back, plus wide scenes for banners and tiles.
// Usage: npm run mockups   →  public/images/mockups/*.webp
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'public', 'images', 'mockups');
const W = 1200, H = 1500;

/** Fabric tones per colour id (slightly lifted for the darkest so they read on black). Keep in sync with src/lib/db/images.ts. */
export const TONES = {
  black: '#2b2b2f', charcoal: '#3a3b3f', graphite: '#5d5f63', stone: '#9a978f', bone: '#dcd6c8', white: '#ececec',
  olive: '#4d5439', navy: '#27304a', wine: '#5a1d28', silver: '#b4b6ba', sand: '#b39e7c', gray: '#85878d',
};
const LIGHT = new Set(['stone', 'bone', 'white', 'silver', 'sand']);
const ALL = Object.keys(TONES);
// The store sells two products for now: the short-sleeve tee (tee-a) and the sleeveless tee (tank).
// The other garment drawings below stay available: add a type here to render it again.
const TYPES = { 'tee-a': ALL, tank: ALL };

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
const stitch = (d, color, o = 0.65) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="7 6" opacity="${o}"/>`;
const line = (d, color, w = 3, o = 0.7) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${o}" stroke-linecap="round"/>`;

// ---- Garments: each returns its outline, inner details, soft folds, floor line and where the Z goes ----------------
// Coordinates are on a 1200 x 1500 canvas. `logo` is the Z's top-left and width; null means no logo on that view.
const TEE = {
  a: 'M512 292 C548 352 652 352 688 292 L862 338 C930 400 980 480 1012 560 L902 634 L866 566 C868 760 872 1000 880 1222 Q600 1244 320 1222 C328 1000 332 760 334 566 L298 634 L188 560 C220 480 270 400 338 338 Z',
  b: 'M512 292 C548 352 652 352 688 292 C760 300 830 330 868 352 C935 420 985 500 1012 572 L904 640 L868 572 C870 780 874 1000 880 1196 C800 1236 700 1248 600 1250 C500 1248 400 1236 320 1196 C326 1000 330 780 332 572 L296 640 L188 572 C215 500 265 420 332 352 C370 330 440 300 512 292 Z',
};
function tee(variant, view, c) {
  const body = view === 'back' ? TEE[variant].replace('C548 352 652 352 688 292', 'C548 312 652 312 688 292') : TEE[variant];
  const d = shade(c.base, c.light ? -0.25 : 0.22);
  const seams = variant === 'b'
    ? stitch('M520 300 C470 380 400 470 334 566', c.stitch) + stitch('M680 300 C730 380 800 470 866 566', c.stitch) + stitch('M324 1168 C400 1206 500 1220 600 1222 C700 1220 800 1206 876 1168', c.stitch)
    : line('M338 338 C350 420 345 500 334 566', shade(c.base, -0.3)) + line('M862 338 C850 420 855 500 866 566', shade(c.base, -0.3)) + stitch('M322 1192 Q600 1214 878 1192', d, 0.55);
  const sleeves = stitch('M215 585 L300 628', d, 0.5) + stitch('M985 585 L900 628', d, 0.5);
  const neck = view === 'back'
    ? `<path d="M512 292 C548 312 652 312 688 292" fill="none" stroke="${shade(c.base, -0.12)}" stroke-width="18" stroke-linecap="round"/>`
    : `<path d="M512 292 C548 270 652 270 688 292 C652 352 548 352 512 292 Z" fill="${shade(c.base, -0.55)}"/><path d="M512 292 C548 352 652 352 688 292" fill="none" stroke="${shade(c.base, -0.12)}" stroke-width="20" stroke-linecap="round"/>`;
  return {
    body, details: seams + sleeves + neck, floor: 1262,
    folds: ['M430 700 C470 820 480 900 470 1010', 'M770 700 C730 820 720 900 730 1010'],
    logo: view === 'front' ? { x: 700, y: 455, w: 58 } : { x: 578, y: 352, w: 44 },
  };
}
function tank(kind, view, c) {
  const front = kind === 'tank'
    ? 'M455 255 L540 255 C552 390 648 390 660 255 L745 255 C752 400 800 500 860 560 L878 1222 Q600 1244 322 1222 L340 560 C400 500 448 400 455 255 Z'
    : 'M490 240 L532 240 C548 480 652 480 668 240 L710 240 C716 460 790 640 868 700 L880 1222 Q600 1244 320 1222 L332 700 C410 640 484 460 490 240 Z';
  const body = view === 'back' ? front.replace(kind === 'tank' ? 'C552 390 648 390 660 255' : 'C548 480 652 480 668 240', kind === 'tank' ? 'C560 310 640 310 660 255' : 'C560 340 640 340 668 240') : front;
  const trim = shade(c.base, -0.14);
  const edges = kind === 'tank'
    ? `<path d="${view === 'back' ? 'M540 255 C560 310 640 310 660 255' : 'M540 255 C552 390 648 390 660 255'}" fill="none" stroke="${trim}" stroke-width="16"/><path d="M455 255 C448 400 400 500 340 560 M745 255 C752 400 800 500 860 560" fill="none" stroke="${trim}" stroke-width="14"/>`
    : `<path d="${view === 'back' ? 'M532 240 C560 340 640 340 668 240' : 'M532 240 C548 480 652 480 668 240'}" fill="none" stroke="${trim}" stroke-width="12"/><path d="M490 240 C484 460 410 640 332 700 M710 240 C716 460 790 640 868 700" fill="none" stroke="${trim}" stroke-width="12"/>`;
  return {
    body, details: edges + stitch('M324 1192 Q600 1214 876 1192', shade(c.base, c.light ? -0.25 : 0.2), 0.55), floor: 1262,
    folds: ['M440 760 C470 880 480 960 470 1060', 'M760 760 C730 880 720 960 730 1060'],
    logo: view === 'front' ? { x: 680, y: kind === 'tank' ? 470 : 560, w: 52 } : { x: 580, y: kind === 'tank' ? 330 : 360, w: 40 },
  };
}
function shorts(kind, view, c) {
  const long = kind === 'shorts2';
  const hem = long ? 1150 : 1080;
  const body = `M330 380 L870 380 L882 470 L${long ? 950 : 930} ${hem} Q${long ? 800 : 800} ${hem + 30} 636 ${hem + 10} L600 ${long ? 800 : 760} L564 ${hem + 10} Q400 ${hem + 30} ${long ? 250 : 270} ${hem} L318 470 Z`;
  const band = `<path d="M330 380 L870 380 L882 470 L318 470 Z" fill="${shade(c.base, -0.25)}"/>` + stitch('M322 462 L878 462', shade(c.base, c.light ? -0.3 : 0.2), 0.5);
  const d = shade(c.base, c.light ? -0.25 : 0.2);
  const hems = stitch(`M${long ? 262 : 280} ${hem - 22} Q400 ${hem + 6} 560 ${hem - 12}`, d, 0.55) + stitch(`M640 ${hem - 12} Q800 ${hem + 6} ${long ? 938 : 920} ${hem - 22}`, d, 0.55);
  const front = view === 'front'
    ? line('M586 430 C582 500 576 560 570 620', '#d8d8d8', 4, 0.8) + line('M614 430 C618 500 624 560 630 620', '#d8d8d8', 4, 0.8) + line('M600 470 L600 660', shade(c.base, -0.35), 3, 0.6)
      + (long ? line('M330 520 L276 1120', shade(c.base, -0.22), 6, 0.55) + line('M870 520 L924 1120', shade(c.base, -0.22), 6, 0.55) : '')
    : `<rect x="650" y="540" width="150" height="110" rx="6" fill="${shade(c.base, -0.12)}"/>` + line('M662 556 L788 556', '#bdbdbd', 3, 0.7) + line('M600 470 L600 700', shade(c.base, -0.35), 3, 0.6);
  return {
    body, details: band + hems + front, floor: hem + 50,
    folds: ['M450 560 C470 700 470 820 455 940', 'M750 560 C730 700 730 820 745 940'],
    logo: view === 'front' ? { x: long ? 800 : 780, y: hem - 140, w: 46 } : { x: 579, y: 400, w: 42 },
  };
}
function socks(view, c) {
  const one = 'M640 300 L800 300 L800 880 C800 990 850 1030 950 1050 C1035 1066 1060 1140 1000 1180 C930 1222 760 1212 700 1150 C658 1108 640 1050 640 980 Z';
  const flip = view === 'back';
  const g = (dx, dy) => `<g transform="translate(${dx} ${dy})${flip ? ' translate(1440 0) scale(-1 1)' : ''}">`;
  const rib = Array.from({ length: 8 }, (_, i) => line(`M${655 + i * 19} 312 L${655 + i * 19} 392`, shade(c.base, -0.18), 3, 0.7)).join('');
  const heel = flip ? `<path d="M640 900 C640 1000 680 1060 730 1080 C700 1010 690 950 700 900 Z" fill="${shade(c.base, -0.2)}"/>` : '';
  const toe = `<path d="M960 1052 C1035 1066 1060 1140 1000 1180 C985 1150 975 1100 960 1052 Z" fill="${shade(c.base, -0.2)}"/>`;
  const sock = (dx, dy) => `${g(dx, dy)}<path d="${one}" fill="url(#__side)"/><path d="${one}" fill="url(#__hi)"/><rect x="640" y="300" width="160" height="96" fill="${shade(c.base, -0.1)}"/>${rib}${heel}${toe}</g>`;
  return {
    custom: sock(-250, 40) + sock(40, 0), floor: 1250, folds: [],
    logos: flip ? [] : [{ x: 690 - 250, y: 450 + 40, w: 52 }, { x: 690 + 40, y: 450, w: 52 }],
  };
}
function cap(view, c) {
  const crown = 'M320 840 C320 540 450 410 600 410 C750 410 880 540 880 840 Z';
  const brim = 'M290 830 C380 790 820 790 910 830 C890 910 770 960 600 960 C430 960 310 910 290 830 Z';
  const seam = shade(c.base, -0.3);
  if (view === 'front') {
    return {
      under: `<path d="${brim}" fill="${shade(c.base, -0.22)}"/>` + stitch('M330 850 C420 890 780 890 870 850', shade(c.base, c.light ? -0.3 : 0.2), 0.6),
      body: crown, floor: 1000,
      details: line('M600 420 C560 560 520 700 500 840', seam) + line('M600 420 C640 560 680 700 700 840', seam) + `<circle cx="600" cy="414" r="14" fill="${shade(c.base, -0.2)}"/>`,
      folds: ['M420 560 C400 650 400 740 410 820'], logo: { x: 540, y: 570, w: 120 },
    };
  }
  return {
    under: `<path d="M300 840 C320 870 880 870 900 840 L880 860 C800 900 400 900 320 860 Z" fill="${shade(c.base, -0.4)}"/>`,
    body: crown, floor: 1000,
    details: line('M600 420 L600 700', seam) + line('M600 420 C560 560 470 700 430 840', seam) + line('M600 420 C640 560 730 700 770 840', seam)
      + `<path d="M500 840 C500 730 700 730 700 840 Z" fill="${shade(c.base, -0.6)}"/><rect x="470" y="760" width="260" height="26" rx="6" fill="${shade(c.base, -0.15)}"/><rect x="580" y="754" width="40" height="38" rx="4" fill="#bdbdbd"/>`,
    folds: [], logo: { x: 575, y: 520, w: 50 },
  };
}
function towel(view, c) {
  if (view === 'front') {
    // Four folded towels; the top one carries the Z.
    const layers = [3, 2, 1].map((i) => `<rect x="300" y="${840 + i * 84}" width="600" height="96" rx="44" fill="${shade(c.base, -0.06 * i)}"/>` + line(`M340 ${840 + i * 84 + 48} L860 ${840 + i * 84 + 48}`, shade(c.base, -0.28), 2, 0.4)).join('');
    return { custom: `<g>${layers}<rect x="300" y="680" width="600" height="190" rx="44" fill="url(#__side)"/><rect x="300" y="680" width="600" height="190" rx="44" fill="url(#__hi)"/><rect x="300" y="680" width="600" height="190" rx="44" fill="none" stroke="#fff" stroke-opacity=".09" stroke-width="3"/></g>`, floor: 1150, folds: [], logos: [{ x: 545, y: 740, w: 110 }] };
  }
  const body = 'M380 260 L820 260 L830 1230 L370 1230 Z';
  return {
    body, floor: 1265, folds: ['M520 400 C510 700 515 900 530 1150'],
    details: `<rect x="372" y="1120" width="456" height="40" fill="${shade(c.base, -0.15)}"/><rect x="380" y="300" width="440" height="34" fill="${shade(c.base, -0.15)}"/>`,
    logo: { x: 720, y: 1040, w: 64 },
  };
}
function bag(view, c) {
  const body = 'M300 640 C220 640 210 700 210 860 C210 1020 220 1080 300 1080 L900 1080 C980 1080 990 1020 990 860 C990 700 980 640 900 640 Z';
  const dark = shade(c.base, -0.3);
  const handles = `<path d="M440 660 C440 470 760 470 760 660" fill="none" stroke="${dark}" stroke-width="30" stroke-linecap="round"/>`;
  const ends = `<ellipse cx="250" cy="860" rx="34" ry="200" fill="${shade(c.base, -0.22)}"/><ellipse cx="950" cy="860" rx="34" ry="200" fill="${shade(c.base, -0.22)}"/>`;
  const zip = line('M300 670 L900 670', '#a9a9a9', 4, 0.8) + `<rect x="880" y="660" width="34" height="22" rx="4" fill="#cfcfcf"/>`;
  const pocket = view === 'back' ? `<rect x="380" y="760" width="440" height="240" rx="16" fill="${shade(c.base, -0.1)}"/>` + line('M400 780 L800 780', '#a9a9a9', 3, 0.7) : '';
  return { under: handles, body, floor: 1110, details: ends + zip + pocket, folds: ['M420 760 C430 880 430 960 420 1040'], logo: view === 'front' ? { x: 545, y: 800, w: 110 } : null };
}

function build(type, view, colour) {
  const base = TONES[colour];
  const c = { base, light: LIGHT.has(colour), stitch: colour === 'charcoal' ? '#7a2229' : shade(base, LIGHT.has(colour) ? -0.25 : 0.22) };
  const g = type === 'tee-a' ? tee('a', view, c) : type === 'tee-b' ? tee('b', view, c) : type === 'tank' || type === 'stringer' ? tank(type, view, c)
    : type === 'shorts' || type === 'shorts2' ? shorts(type, view, c) : type === 'socks' ? socks(view, c) : type === 'cap' ? cap(view, c) : type === 'towel' ? towel(view, c) : bag(view, c);
  return { ...g, c };
}

/** One garment as an SVG group with its own gradient ids, so several can share one scene. */
function garmentSvg(type, view, colour, id, transform = '') {
  const { body, details = '', folds = [], under = '', custom, floor, c } = build(type, view, colour);
  const dark = shade(c.base, -0.38), mid = shade(c.base, -0.16), hi = shade(c.base, c.light ? 0.1 : 0.16);
  const defs = `<defs>
    <linearGradient id="${id}side" x1="0" x2="1"><stop offset="0" stop-color="${dark}"/><stop offset=".22" stop-color="${mid}"/><stop offset=".5" stop-color="${c.base}"/><stop offset=".78" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <radialGradient id="${id}hi" cx=".5" cy=".3" r=".6"><stop offset="0" stop-color="${hi}" stop-opacity=".55"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1"><stop offset=".7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
    <filter id="${id}blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="${id}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="26"/></filter>
    ${body ? `<clipPath id="${id}clip"><path d="${body}"/></clipPath>` : ''}
  </defs>`;
  const shadow = `<ellipse cx="600" cy="${floor}" rx="340" ry="30" fill="#000" opacity=".75" filter="url(#${id}soft)"/>`;
  const main = custom
    ? custom.replaceAll('__side', `${id}side`).replaceAll('__hi', `${id}hi`)
    : `<path d="${body}" fill="url(#${id}side)"/><g clip-path="url(#${id}clip)"><rect width="1200" height="1500" fill="url(#${id}hi)"/><rect width="1200" height="1500" fill="url(#${id}v)"/>
       <g filter="url(#${id}blur)" opacity="${c.light ? 0.09 : 0.2}" stroke="#000" stroke-width="22" fill="none" stroke-linecap="round">${folds.map((f) => `<path d="${f}"/>`).join('')}</g></g>${details}
       <path d="${body}" fill="none" stroke="#fff" stroke-opacity="${c.light ? 0.05 : 0.1}" stroke-width="3"/>`;
  return `${defs}<g transform="${transform}">${shadow}${under}${main}</g>`;
}
function logosFor(type, view, colour) {
  const g = build(type, view, colour);
  return (g.logos ?? (g.logo ? [g.logo] : [])).map((l) => ({ ...l, light: LIGHT.has(colour) }));
}

const BG = (w, h) => `<defs><radialGradient id="bg" cx=".5" cy=".42" r=".78"><stop offset="0" stop-color="#262626"/><stop offset=".6" stop-color="#131313"/><stop offset="1" stop-color="#0a0a0a"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#sheen)"/><defs><linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1"><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".035"/><stop offset=".65" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>`;

const zCache = new Map();
async function z(light, width) {
  const key = `${light}-${width}`;
  if (!zCache.has(key)) {
    const img = sharp('public/brand/z-only.webp').trim();
    zCache.set(key, await (light ? img.negate({ alpha: false }) : img).resize({ width: Math.max(8, Math.round(width)) }).png().toBuffer());
  }
  return zCache.get(key);
}

/** Renders a scene: items = [{type, view, colour, x, y, s}] placed on a w x h dark background. */
async function scene(file, w, h, items, quality = 80) {
  const groups = items.map((it, i) => garmentSvg(it.type, it.view ?? 'front', it.colour, `g${i}`, `translate(${it.x} ${it.y}) scale(${it.s})`)).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${BG(w, h)}${groups}</svg>`;
  const comps = [];
  for (const it of items) {
    for (const l of logosFor(it.type, it.view ?? 'front', it.colour)) comps.push({ input: await z(l.light, l.w * it.s), left: Math.round(it.x + l.x * it.s), top: Math.round(it.y + l.y * it.s) });
  }
  await sharp(Buffer.from(svg)).composite(comps).webp({ quality, effort: 5 }).toFile(path.join(OUT, file));
}

await fs.mkdir(OUT, { recursive: true });
const only = process.argv[2]; // a type, 'products' or 'scenes'
const onlyColour = process.argv[3]; // optional, for previews
let n = 0;
for (const [type, colours] of Object.entries(TYPES)) {
  if (only && only !== type && only !== 'products') continue;
  for (const colour of colours) {
    if (onlyColour && colour !== onlyColour) continue;
    for (const view of ['front', 'back']) {
      await scene(`${type}-${colour}-${view}.webp`, W, H, [{ type, view, colour, x: 0, y: 0, s: 1 }], 78);
      n++;
    }
  }
  console.log(`✓ ${type}`);
}
if (!only || only === 'scenes') {
  // Items in a centred row; `step` is the distance between items, sleeves may overlap slightly.
  const row = (types, colours, w, h, s, y, step = 440) => types.map((t, i) => ({ type: t, colour: colours[i], s, y, x: Math.round((w - ((types.length - 1) * step + 1200 * s)) / 2 + i * step) }));
  await scene('hero.webp', 2400, 1350, [
    { type: 'tank', colour: 'gray', x: 230, y: 250, s: 0.72 }, { type: 'tee-a', colour: 'white', x: 1305, y: 250, s: 0.72 },
    { type: 'tee-a', colour: 'black', x: 660, y: 40, s: 0.9 },
  ]);
  await scene('scene-tees.webp', 2400, 1100, row(['tee-a', 'tee-a', 'tee-a'], ['gray', 'black', 'white'], 2400, 1100, 0.66, 70, 620));
  await scene('scene-sleeveless.webp', 2400, 1100, row(['tank', 'tank', 'tank'], ['white', 'black', 'gray'], 2400, 1100, 0.66, 70, 620));
  await scene('scene-all.webp', 2400, 1100, row(['tank', 'tee-a', 'tank', 'tee-a'], ['white', 'black', 'gray', 'white'], 2400, 1100, 0.6, 110, 500));
  console.log('✓ scenes');
}
console.log(`Rendered ${n} product mockups.`);
