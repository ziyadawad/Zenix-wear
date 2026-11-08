// Prepares the only photos of people allowed on the site.
// 1. Put photo-1.jpg, photo-2.jpg and photo-4.jpg in public/approved-photos/
// 2. Run: npm run photos:approved
//    Options: --photo4-crop=0.78  keep the top 78% of photo-4 (use if the caption bar was not found exactly)
//
// What it does: removes the Snapchat caption bar from photo-4, grades all three to the black/silver brand
// with a subtle dark overlay, saves WebP copies in public/images/approved/, moves the originals OUT of
// public/ into approved-photos-originals/ (git-ignored), writes a preview to check the crop, and updates
// src/lib/approved-photos.ts so the site starts using them. next/image then serves 480 to 1920 px
// WebP/AVIF versions for phones and desktops automatically.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
const INBOX = path.join(ROOT, 'public', 'approved-photos');
const VAULT = path.join(ROOT, 'approved-photos-originals');
const OUT = path.join(ROOT, 'public', 'images', 'approved');
const MANIFEST = path.join(ROOT, 'src', 'lib', 'approved-photos.ts');

/** Which photo goes where, and which part of it stays in frame when it is cropped to fit. */
const SLOTS = [
  { slot: 'hero', file: 'photo-1', position: '50% 30%' },
  { slot: 'tshirts', file: 'photo-2', position: '50% 25%' },
  { slot: 'about', file: 'photo-4', position: '50% 30%', caption: true },
];

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

async function findOriginal(name) {
  for (const dir of [INBOX, VAULT]) {
    for (const ext of ['.jpg', '.jpeg', '.png', '.webp', '.JPG', '.JPEG', '.PNG']) {
      const p = path.join(dir, name + ext);
      try { await fs.access(p); return p; } catch { /* try the next one */ }
    }
  }
  return null;
}

/**
 * Finds the top edge of a Snapchat caption bar: a full-width band that darkens almost every column at once.
 * Returns the row to cut at, or null if no clear bar is found.
 */
async function findCaptionTop(file) {
  const w = 240;
  const { data, info } = await sharp(file).rotate().resize({ width: w }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const h = info.height;
  const px = (x, y) => data[y * w + x];
  let best = { y: -1, score: 0 };
  for (let y = Math.floor(h * 0.35); y < h - 4; y++) {
    let darker = 0, drop = 0;
    for (let x = 0; x < w; x++) {
      const above = (px(x, y - 3) + px(x, y - 2) + px(x, y - 1)) / 3;
      const below = (px(x, y) + px(x, y + 1) + px(x, y + 2)) / 3;
      if (above - below > 6) darker++;
      drop += above - below;
    }
    const share = darker / w;
    const score = share > 0.7 ? share * (drop / w) : 0;
    if (score > best.score) best = { y, score };
  }
  return best.score > 8 ? Math.round((best.y / h) * 1000) / 1000 : null;
}

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  await fs.mkdir(VAULT, { recursive: true });
  const manifest = { hero: null, tshirts: null, about: null };
  const previews = [];

  for (const s of SLOTS) {
    const src = await findOriginal(s.file);
    if (!src) { console.warn(`! ${s.file} not found: "${s.slot}" keeps its product/brand fallback.`); continue; }
    const meta = await sharp(src).rotate().metadata();
    const width = meta.autoOrient?.width ?? meta.width;
    const height = meta.autoOrient?.height ?? meta.height;
    let img = sharp(src).rotate();

    if (s.caption) {
      const forced = arg('photo4-crop');
      const found = forced ? Number(forced) : await findCaptionTop(src);
      const keep = found ?? 0.78;
      // Cut a little above the bar so no edge of it or its text survives.
      const cropH = Math.floor(height * keep) - Math.round(height * 0.012);
      img = sharp(await img.extract({ left: 0, top: 0, width, height: cropH }).toBuffer());
      console.log(`  ${s.file}: caption bar ${forced ? 'cut at the given' : found ? 'found at' : 'NOT found; cut at default'} ${Math.round(keep * 100)}% of the height. Check approved-photos-originals/preview.jpg`);
    }

    // Brand grade: less colour, a touch darker, then a subtle black overlay. The pages add their own gradient on top.
    const graded = await img.resize({ width: 1920, withoutEnlargement: true }).modulate({ saturation: 0.72, brightness: 0.9 }).linear(1.06, -6).toBuffer({ resolveWithObject: true });
    const overlay = { input: { create: { width: graded.info.width, height: graded.info.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.14 } } } };
    const outFile = path.join(OUT, `${s.slot}.webp`);
    await sharp(graded.data).composite([overlay]).webp({ quality: 80 }).toFile(outFile);
    const out = await sharp(outFile).metadata();
    manifest[s.slot] = { src: `/images/approved/${s.slot}.webp`, width: out.width, height: out.height, position: s.position };
    previews.push(outFile);

    // Originals never stay in public/: move them to the git-ignored vault.
    if (path.dirname(src) === INBOX) await fs.rename(src, path.join(VAULT, path.basename(src)));
    console.log(`✓ ${s.file} → ${manifest[s.slot].src} (${out.width}×${out.height})`);
  }

  try { if (!(await fs.readdir(INBOX)).length) await fs.rmdir(INBOX); } catch { /* inbox already gone */ }

  if (previews.length) {
    const tiles = await Promise.all(previews.map((p) => sharp(p).resize({ height: 600 }).toBuffer({ resolveWithObject: true })));
    const total = tiles.reduce((a, t) => a + t.info.width + 10, 0);
    let left = 0;
    await sharp({ create: { width: total, height: 600, channels: 3, background: '#222' } })
      .composite(tiles.map((t) => { const c = { input: t.data, left, top: 0 }; left += t.info.width + 10; return c; }))
      .jpeg({ quality: 80 }).toFile(path.join(VAULT, 'preview.jpg'));
  }

  const body = `// GENERATED by \`npm run photos:approved\`. Do not edit by hand.
// The only photos of people allowed on the site. Each slot is null until its photo has been processed,
// and every place that uses one falls back to a product shot or the dark brand background.
export interface ApprovedPhoto { src: string; width: number; height: number; position: string }

export const APPROVED_PHOTOS: { hero: ApprovedPhoto | null; tshirts: ApprovedPhoto | null; about: ApprovedPhoto | null } = ${JSON.stringify(manifest, null, 2).replace(/"(\w+)":/g, '$1:').replace(/"/g, "'")};
`;
  await fs.writeFile(MANIFEST, body);
  console.log('Updated src/lib/approved-photos.ts');
}
main().catch((e) => { console.error(e); process.exit(1); });
