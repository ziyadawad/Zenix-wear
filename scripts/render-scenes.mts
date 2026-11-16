// Renders every shipped product image as an "ambient light" studio scene (src/lib/scene/compose.ts):
// each garment type in every colour, front and back, the Open Graph versions, and the wide banner scenes.
// It also writes the logo assets used by /api/scene (colours added from the admin).
//
// Usage: npm run scenes                → public/images/scenes-v<SCENE_VERSION>/*.webp (src/lib/db/images.ts)
//        npm run scenes -- tank white  → one type and colour only (for previews)
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { NEON, neonFor } from '../config/scene.config';
import { OG_H, OG_W, SCENE_W, fabricTone, ogSceneSvg, pipingFor, productSceneSvg, sceneSvg, type SceneAssets, type SceneItem } from '../src/lib/scene/compose';
import { FLOOR, GARMENT_TYPES, type GarmentType } from '../src/lib/scene/garments';
import { SCENE_COLOURS, SWATCH } from '../src/lib/scene/colours';
import { MOCKUPS } from '../src/lib/db/images';

const OUT = path.join(process.cwd(), 'public', MOCKUPS);
const [onlyType, onlyColour] = process.argv.slice(2);

async function assets(): Promise<SceneAssets> {
  // The real logo files, only resized (and the Z inverted for light fabric). Never redrawn.
  const logo = sharp('public/brand/logo-icon-full.webp').resize({ width: 420 });
  const logoPng = await logo.png().toBuffer();
  const lm = await sharp(logoPng).metadata();
  const z = sharp('public/brand/z-only.webp').trim().resize({ width: 160 });
  const zPng = await z.png().toBuffer();
  const zm = await sharp(zPng).metadata();
  const zDark = await sharp(zPng).negate({ alpha: false }).png().toBuffer();
  const uri = (b: Buffer) => `data:image/png;base64,${b.toString('base64')}`;
  return { logo: uri(logoPng), logoW: lm.width!, logoH: lm.height!, z: uri(zPng), zDark: uri(zDark), zW: zm.width!, zH: zm.height! };
}

async function render(file: string, svg: string, quality = 80) {
  await sharp(Buffer.from(svg)).webp({ quality, effort: 6, smartSubsample: true }).toFile(path.join(OUT, file));
}

const a = await assets();
await fs.mkdir(OUT, { recursive: true });
await fs.writeFile(
  path.join('src', 'lib', 'scene', 'assets.generated.ts'),
  `// Written by scripts/render-scenes.mts from public/brand/logo-icon-full.webp and z-only.webp. Do not edit.\nimport type { SceneAssets } from './compose';\nexport const SCENE_ASSETS: SceneAssets = ${JSON.stringify(a)};\n`,
);

let n = 0;
for (const type of GARMENT_TYPES) {
  if (onlyType && onlyType !== type && onlyType !== 'products') continue;
  for (const colour of SCENE_COLOURS) {
    if (onlyColour && colour !== onlyColour) continue;
    const hex = SWATCH[colour], neon = neonFor(colour);
    for (const view of ['front', 'back'] as const) {
      await render(`${type}-${colour}-${view}.webp`, productSceneSvg(type, view, colour, hex, neon, a), 80);
      n++;
    }
    await render(`og-${type}-${colour}.webp`, ogSceneSvg(type, colour, hex, neon, a), 82);
  }
  console.log(`✓ ${type}`);
}

if (!onlyType || onlyType === 'scenes') {
  const item = (type: GarmentType, colour: string, x: number, floor: number, s: number): SceneItem => ({
    type, view: 'front', hex: SWATCH[colour], tone: fabricTone(colour, SWATCH[colour]), neon: neonFor(colour), piping: pipingFor(colour, SWATCH[colour]), x, y: floor - FLOOR * s, s,
  });
  // A row of garments standing on one floor, centred.
  const row = (types: GarmentType[], colours: string[], w: number, floor: number, s: number, step: number) =>
    types.map((t, i) => item(t, colours[i], Math.round((w - ((types.length - 1) * step + SCENE_W * s)) / 2 + i * step), floor, s));
  const wide = async (file: string, w: number, h: number, items: SceneItem[], neon: string) => render(file, sceneSvg({ w, h, items, neon, assets: a, logo: null, seed: 23 }), 78);
  await wide('hero.webp', 2400, 1350, [item('tank', 'gray', 230, 1190, 0.66), item('tee-a', 'white', 1378, 1190, 0.66), item('tee-a', 'black', 708, 1190, 0.82)], NEON.black);
  // Category tiles (4:3 on phones, 5:4 on computers): 5:4 with the garments inside the 4:3 crop.
  await wide('scene-tees.webp', 1600, 1280, row(['tee-a', 'tee-a', 'tee-a'], ['gray', 'black', 'white'], 1600, 1110, 0.6, 520), NEON.black);
  await wide('scene-sleeveless.webp', 1600, 1280, row(['tank', 'tank', 'tank'], ['white', 'black', 'gray'], 1600, 1110, 0.6, 520), NEON.black);
  await wide('scene-all.webp', 2400, 1100, row(['tank', 'tee-a', 'tank', 'tee-a'], ['white', 'black', 'gray', 'white'], 2400, 1010, 0.6, 500), NEON.black);
  // Site-wide Open Graph image.
  await render('og-home.webp', sceneSvg({ w: OG_W, h: OG_H, assets: a, neon: NEON.black, seed: 5, logo: { x: 90, y: 175, w: 340 },
    items: [item('tank', 'gray', 470, 600, 0.38), item('tee-a', 'white', 790, 600, 0.38), item('tee-a', 'black', 620, 610, 0.42)] }), 82);
  console.log('✓ scenes');
}
console.log(`Rendered ${n} product scenes.`);
