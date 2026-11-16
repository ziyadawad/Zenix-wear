// Builds every product image on the site from the real product photos in product-photos/ (kept out of public/).
// Each source file shows the FRONT view (left half) and the BACK view (right half) on a black background.
//
// Output (public/products/):
//   <product>/<colour>-front.webp, <colour>-back.webp   1000 x 1250 (4:5), garment centred with even padding,
//                                                       the same scale for every product, colour and view
//   <product>/<colour>-og.webp                          1200 x 630 social-sharing image (front + back + logo)
//   banners/*.webp                                      hero, shop and category banners, site-wide social image
//
// Usage: npm run photos      (run it again after replacing a source photo)
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const SRC = 'product-photos';
const OUT = path.join('public', 'products');
/** Source file name → product folder. */
const PRODUCTS: Record<string, string> = { 'short-sleeve': 'short-sleeve', sleeveless: 'sleeveless' };
const COLOURS = ['black', 'white'];
const W = 1000, H = 1250;
/** Share of the frame the tallest / widest garment fills. */
const FILL = 0.86;
const BG = { r: 0, g: 0, b: 0 };

interface View { product: string; colour: string; view: 'front' | 'back'; img: sharp.Sharp; box: { left: number; top: number; width: number; height: number } }

/** The garment's bounding box inside one half: every pixel brighter than the black background counts. */
async function bbox(img: sharp.Sharp) {
  const { data, info } = await img.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const T = 9; // brightness threshold over the pure black background (catches the dark fabric's edges)
  const rows = new Array(height).fill(0), cols = new Array(width).fill(0);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[y * width + x] > T) { rows[y]++; cols[x]++; }
  const min = 3; // ignore single stray pixels
  const first = (a: number[]) => a.findIndex((v) => v >= min), last = (a: number[]) => a.length - 1 - [...a].reverse().findIndex((v) => v >= min);
  const left = first(cols), right = last(cols), top = first(rows), bottom = last(rows);
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

async function load(): Promise<View[]> {
  const views: View[] = [];
  for (const [file, product] of Object.entries(PRODUCTS)) {
    for (const colour of COLOURS) {
      const src = path.join(SRC, `${file}-${colour}.png`);
      const meta = await sharp(src).metadata();
      const mid = Math.floor(meta.width! / 2);
      // Skip the thin divider line just right of the middle (a few pixels wide) between the two views.
      const halves = { front: { left: 0, width: mid - 2 }, back: { left: mid + 10, width: meta.width! - mid - 10 } };
      for (const view of ['front', 'back'] as const) {
        const buf = await sharp(src).extract({ left: halves[view].left, top: 0, width: halves[view].width, height: meta.height! }).removeAlpha().png().toBuffer();
        const img = sharp(buf);
        views.push({ product, colour, view, img, box: await bbox(img) });
      }
    }
  }
  return views;
}

const views = await load();
// One scale for everything, so both colours, both views and both products sit at the same size.
const maxH = Math.max(...views.map((v) => v.box.height)), maxW = Math.max(...views.map((v) => v.box.width));
const scale = Math.min((H * FILL) / maxH, (W * FILL) / maxW);
console.log(`scale ×${scale.toFixed(2)} (tallest garment ${maxH}px, widest ${maxW}px)`);

/** The garment cut to its box and scaled. */
const cut = (v: View, k = scale) => v.img.clone().extract(v.box).resize({ width: Math.round(v.box.width * k), kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).png().toBuffer();
const size = async (b: Buffer) => { const m = await sharp(b).metadata(); return { w: m.width!, h: m.height! }; };
const canvas = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: BG } });

for (const p of Object.values(PRODUCTS)) await fs.mkdir(path.join(OUT, p), { recursive: true });
await fs.mkdir(path.join(OUT, 'banners'), { recursive: true });

for (const v of views) {
  const g = await cut(v), s = await size(g);
  await canvas(W, H).composite([{ input: g, left: Math.round((W - s.w) / 2), top: Math.round((H - s.h) / 2) }])
    .webp({ quality: 88, effort: 6, smartSubsample: true }).toFile(path.join(OUT, v.product, `${v.colour}-${v.view}.webp`));
}
console.log(`✓ ${views.length} product images`);

const logo = await sharp('public/brand/logo-icon-full.webp').resize({ width: 300 }).png().toBuffer();
const find = (product: string, colour: string, view: 'front' | 'back') => views.find((v) => v.product === product && v.colour === colour && v.view === view)!;

/** Garments in a row on black, all at one scale, standing on the same line, centred. */
async function row(file: string, w: number, h: number, items: View[], fill: number, gap: number, withLogo = false) {
  const k = (h * fill) / maxH;
  const cuts = await Promise.all(items.map(async (v) => { const b = await cut(v, k); return { b, ...(await size(b)) }; }));
  const total = cuts.reduce((a, c) => a + c.w, 0) + gap * (cuts.length - 1);
  // The logo (when shown) sits to the left of the garments; the whole group is centred.
  const logoW = withLogo ? 300 + 60 : 0;
  const start = Math.round((w - total - logoW) / 2);
  let x = start + logoW;
  const base = Math.round(h / 2 + (maxH * k) / 2);
  const comps = cuts.map((c) => { const o = { input: c.b, left: x, top: base - c.h }; x += c.w + gap; return o; });
  if (withLogo) comps.push({ input: logo, left: start, top: Math.round(h / 2 - 112) });
  await canvas(w, h).composite(comps).webp({ quality: 84, effort: 6 }).toFile(path.join(OUT, file));
}

for (const p of Object.values(PRODUCTS)) {
  for (const c of COLOURS) await row(`${p}/${c}-og.webp`, 1200, 630, [find(p, c, 'front'), find(p, c, 'back')], 0.74, 24, true);
}
const ss = 'short-sleeve', sl = 'sleeveless';
/**
 * The garment on a transparent background, for the homepage hero (which lights each shirt from behind in CSS).
 * Background = every near-black pixel connected to the photo's border (flood fill), so dark shadows inside a black
 * shirt are never cut out. The edge is softened by a pixel. All cut-outs share one 800 x 1000 frame and one scale,
 * centred, standing on the same line.
 */
async function cutout(v: View, file: string) {
  const { data, info } = await v.img.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const bg = new Uint8Array(w * h), stack: number[] = [];
  const T = 2; // the photos' background is 0-1; dark folds in a black shirt start just above
  const push = (i: number) => { if (!bg[i] && data[i] <= T) { bg[i] = 1; stack.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (stack.length) {
    const i = stack.pop()!, x = i % w;
    if (x > 0) push(i - 1);
    if (x < w - 1) push(i + 1);
    if (i >= w) push(i - w);
    if (i < w * (h - 1)) push(i + w);
  }
  const mask = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) mask[i] = bg[i] ? 0 : 255;
  // Close the shape (grow then shrink by ~16px): fills deep shadows under the sleeves that are as black as the
  // background, without changing the outline. Then soften the edge by a pixel.
  // (sharp runs its operations in a fixed order, so the max / min filters are done here, row then column.)
  const R = 16;
  const morph = (src: Buffer, grow: boolean) => {
    const pass = (a: Buffer, horizontal: boolean) => {
      const out = Buffer.alloc(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = grow ? 0 : 255;
        for (let d = -R; d <= R; d++) {
          const xx = horizontal ? x + d : x, yy = horizontal ? y : y + d;
          const s = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : a[yy * w + xx];
          v = grow ? Math.max(v, s) : Math.min(v, s);
        }
        out[y * w + x] = v;
      }
      return out;
    };
    return pass(pass(src, true), false);
  };
  const closed = morph(morph(mask, true), false);
  const alpha = await sharp(closed, { raw: { width: w, height: h, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer();
  // Interleave the colour pixels with the mask by hand (RGB + A).
  const { data: rgb, info: ri } = await v.img.clone().raw().toBuffer({ resolveWithObject: true });
  const c = ri.channels, ac = alpha.length / (w * h); // colour channels in, and the mask's channels (blur may widen it)
  const px = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const g = c === 1;
    px[i * 4] = rgb[i * c]; px[i * 4 + 1] = rgb[i * c + (g ? 0 : 1)]; px[i * 4 + 2] = rgb[i * c + (g ? 0 : 2)]; px[i * 4 + 3] = alpha[i * ac];
  }
  const rgba = await sharp(px, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const CW = 800, CH = 1000, k = (CH * 0.92) / maxH;
  const g = await sharp(rgba).extract(v.box).resize({ width: Math.round(v.box.width * k), kernel: 'lanczos3' }).sharpen({ sigma: 0.6 }).png().toBuffer();
  const s = await size(g);
  const base = Math.round(CH / 2 + (maxH * k) / 2);
  await sharp({ create: { width: CW, height: CH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: g, left: Math.round((CW - s.w) / 2), top: base - s.h }])
    .webp({ quality: 88, alphaQuality: 90, effort: 6 }).toFile(path.join(OUT, file));
}
// Homepage hero: white short-sleeve (left) and black short-sleeve (right).
await fs.mkdir(path.join(OUT, 'hero'), { recursive: true });
await cutout(find(ss, 'white', 'front'), 'hero/short-sleeve-white.webp');
await cutout(find(ss, 'black', 'front'), 'hero/short-sleeve-black.webp');
// Shop and category banners: wide (the page headers are about 3.5:1 on computers), garments whole and centred.
await row('banners/shop.webp', 2400, 720, [find(sl, 'white', 'front'), find(ss, 'black', 'front'), find(sl, 'black', 'front'), find(ss, 'white', 'front')], 0.86, 60);
await row('banners/short-sleeve.webp', 2400, 720, [find(ss, 'black', 'front'), find(ss, 'white', 'front'), find(ss, 'black', 'back')], 0.86, 80);
await row('banners/sleeveless.webp', 2400, 720, [find(sl, 'black', 'front'), find(sl, 'white', 'front'), find(sl, 'white', 'back')], 0.86, 80);
await row('banners/og.webp', 1200, 630, [find(ss, 'black', 'front'), find(sl, 'white', 'front')], 0.76, 30, true);
// For a colour added in the admin before its photos are uploaded: the logo on the same black background.
await canvas(W, H).composite([{ input: await sharp('public/brand/logo-icon-full.webp').resize({ width: 380 }).png().toBuffer(), gravity: 'centre' }])
  .webp({ quality: 85 }).toFile(path.join(OUT, 'placeholder.webp'));
console.log('✓ social images, banners and placeholder');
