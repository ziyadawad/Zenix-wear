// Renders product-only T-shirt shots (no model) on the dark studio background used by the other products.
// Usage: node scripts/render-tee-shots.mjs
// Output: public/images/products/tee-{a|b}-{colour}-p1.webp (front) and -p2.webp (chest close-up),
//         public/images/products/tee-lineup.webp (wide banner with five tees).
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.join(process.cwd(), 'public', 'images', 'products');
const W = 1200, H = 1500;

/** Display tones: the swatch hex of very dark colours would vanish on the black background. */
const TONES = {
  black: '#27272a', charcoal: '#3a3b3f', graphite: '#5d5f63', stone: '#9a978f', bone: '#dcd6c8',
  olive: '#4d5439', navy: '#27304a', wine: '#5a1d28', silver: '#b4b6ba', sand: '#b39e7c',
};
const LIGHT = new Set(['stone', 'bone', 'silver', 'sand']);
const VARIANTS = {
  a: ['black', 'bone', 'graphite', 'navy', 'olive', 'sand', 'silver', 'stone', 'wine'],
  b: ['bone', 'charcoal', 'graphite', 'navy', 'olive', 'sand', 'silver', 'stone', 'wine'],
};

const shade = (hex, f) => {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(f >= 0 ? v + (255 - v) * f : v * (1 + f)))));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

// Front silhouette on a 1200 x 1500 canvas. A: set-in sleeves, straight hem. B: raglan, curved hem.
const BODY = {
  a: 'M512 292 C548 352 652 352 688 292 L862 338 C930 400 980 480 1012 560 L902 634 L866 566 C868 760 872 1000 880 1222 Q600 1244 320 1222 C328 1000 332 760 334 566 L298 634 L188 560 C220 480 270 400 338 338 Z',
  b: 'M512 292 C548 352 652 352 688 292 C760 300 830 330 868 352 C935 420 985 500 1012 572 L904 640 L868 572 C870 780 874 1000 880 1196 C800 1236 700 1248 600 1250 C500 1248 400 1236 320 1196 C326 1000 330 780 332 572 L296 640 L188 572 C215 500 265 420 332 352 C370 330 440 300 512 292 Z',
};

function teeSvg(variant, colour, { withBg = true, tx = 0, ty = 0, scale = 1, id = 't' } = {}) {
  const base = TONES[colour];
  const light = LIGHT.has(colour);
  const dark = shade(base, -0.38), mid = shade(base, -0.16), hi = shade(base, light ? 0.1 : 0.14);
  const stitch = colour === 'charcoal' ? '#7a2229' : shade(base, light ? -0.25 : 0.22);
  const raglan = variant === 'b'
    ? `<path d="M520 300 C470 380 400 470 334 566" fill="none" stroke="${stitch}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".75"/>
       <path d="M680 300 C730 380 800 470 866 566" fill="none" stroke="${stitch}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".75"/>`
    : `<path d="M338 338 C350 420 345 500 334 566" fill="none" stroke="${shade(base, -0.3)}" stroke-width="3" opacity=".7"/>
       <path d="M862 338 C850 420 855 500 866 566" fill="none" stroke="${shade(base, -0.3)}" stroke-width="3" opacity=".7"/>`;
  const hem = variant === 'b'
    ? `<path d="M324 1168 C400 1206 500 1220 600 1222 C700 1220 800 1206 876 1168" fill="none" stroke="${stitch}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".7"/>`
    : `<path d="M322 1192 Q600 1214 878 1192" fill="none" stroke="${shade(base, light ? -0.25 : 0.2)}" stroke-width="2.5" stroke-dasharray="7 6" opacity=".6"/>`;
  const g = `
  <defs>
    <linearGradient id="${id}side" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="${dark}"/><stop offset=".2" stop-color="${mid}"/><stop offset=".5" stop-color="${base}"/>
      <stop offset=".8" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
    </linearGradient>
    <radialGradient id="${id}hi" cx=".5" cy=".3" r=".55"><stop offset="0" stop-color="${hi}" stop-opacity=".55"/><stop offset="1" stop-color="${hi}" stop-opacity="0"/></radialGradient>
    <linearGradient id="${id}v" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <clipPath id="${id}clip"><path d="${BODY[variant]}"/></clipPath>
    <filter id="${id}blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="${id}soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="${id}grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .5  0 0 0 0 .5  0 0 0 0 .5  0 0 0 .5 0"/></filter>
  </defs>
  <g transform="translate(${tx} ${ty}) scale(${scale})">
    <ellipse cx="600" cy="1268" rx="330" ry="34" fill="#000" opacity=".7" filter="url(#${id}soft)"/>
    <path d="${BODY[variant]}" fill="url(#${id}side)"/>
    <g clip-path="url(#${id}clip)">
      <rect width="1200" height="1500" fill="url(#${id}hi)"/>
      <rect width="1200" height="1500" fill="url(#${id}v)"/>
      <g filter="url(#${id}blur)" opacity="${light ? 0.09 : 0.2}" stroke="#000" stroke-width="22" fill="none" stroke-linecap="round">
        <path d="M430 700 C470 820 480 900 470 1010"/><path d="M770 700 C730 820 720 900 730 1010"/>
      </g>
      <g filter="url(#${id}blur)" opacity="${light ? 0.25 : 0.14}" stroke="#fff" stroke-width="18" fill="none" stroke-linecap="round">
        <path d="M600 420 C610 600 600 800 600 1000"/>
      </g>
      <rect width="1200" height="1500" filter="url(#${id}grain)" opacity="${light ? 0.08 : 0.1}"/>
    </g>
    ${raglan}${hem}
    <path d="M512 292 C548 270 652 270 688 292 C652 352 548 352 512 292 Z" fill="${shade(base, -0.55)}"/>
    <path d="M512 292 C548 352 652 352 688 292" fill="none" stroke="${shade(base, -0.12)}" stroke-width="20" stroke-linecap="round"/>
    <path d="M512 292 C548 352 652 352 688 292" fill="none" stroke="${shade(base, -0.4)}" stroke-width="2" transform="translate(0 11)"/>
  </g>`;
  const bg = withBg ? `<defs><radialGradient id="bg" cx=".5" cy=".42" r=".75"><stop offset="0" stop-color="#262626"/><stop offset=".6" stop-color="#141414"/><stop offset="1" stop-color="#0b0b0b"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#bg)"/>` : '';
  return { bg, g };
}

async function logo(light, width) {
  const z = sharp('public/brand/z-only.webp').trim();
  const img = light ? z.negate({ alpha: false }) : z;
  return img.resize({ width }).png().toBuffer();
}

async function renderTee(variant, colour) {
  const { bg, g } = teeSvg(variant, colour);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">${bg}${g}</svg>`;
  const z = await logo(LIGHT.has(colour), 112);
  // Render at 2x, place the chest logo, then derive the full shot and the close-up from the same frame.
  const big = await sharp(Buffer.from(svg)).composite([{ input: z, left: 1400, top: 920, blend: 'over' }]).png().toBuffer();
  const name = `tee-${variant}-${colour}`;
  await sharp(big).resize(W, H).webp({ quality: 82 }).toFile(path.join(OUT, `${name}-p1.webp`));
  await sharp(big).extract({ left: 700, top: 560, width: 1200, height: 1500 }).webp({ quality: 82 }).toFile(path.join(OUT, `${name}-p2.webp`));
}

async function renderLineup() {
  const LW = 2400, LH = 1100;
  const picks = [['a', 'olive'], ['b', 'bone'], ['a', 'black'], ['b', 'navy'], ['a', 'wine']];
  const s = 0.62;
  const tx = (i) => -62 + i * 445, ty = 72; // five tees, centred, slightly overlapping sleeves
  const parts = picks.map(([v, c], i) => teeSvg(v, c, { withBg: false, tx: tx(i), ty, scale: s, id: `l${i}` }).g);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${LW}" height="${LH}">
    <defs><radialGradient id="bg" cx=".5" cy=".45" r=".8"><stop offset="0" stop-color="#242424"/><stop offset=".6" stop-color="#121212"/><stop offset="1" stop-color="#090909"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>${parts.join('')}</svg>`;
  const logos = await Promise.all(picks.map(async ([, c], i) => ({
    input: await logo(LIGHT.has(c), 35), left: Math.round(tx(i) + 700 * s), top: Math.round(ty + 460 * s),
  })));
  await sharp(Buffer.from(svg)).composite(logos).webp({ quality: 82 }).toFile(path.join(OUT, 'tee-lineup.webp'));
}

for (const [variant, colours] of Object.entries(VARIANTS)) {
  for (const c of colours) await renderTee(variant, c);
}
await renderLineup();
console.log('Rendered T-shirt product shots.');
