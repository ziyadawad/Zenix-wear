import sharp from 'sharp';
import { neonFor } from '../../../../../../../../config/scene.config';
import { ogSceneSvg, productSceneSvg } from '@/lib/scene/compose';
import { isGarmentType } from '@/lib/scene/garments';
import { SCENE_ASSETS } from '@/lib/scene/assets.generated';

/**
 * The product scene for a colour added from the admin (pre-rendered colours are static files in
 * /images/scenes/). Same drawing as `npm run scenes`, in the colour's own swatch, with its neon from
 * config/scene.config.ts (DEFAULT_NEON when the colour is not listed). The URL holds every input, so the
 * response never changes and is cached for a year.
 */
export async function GET(_: Request, ctx: { params: Promise<{ type: string; colour: string; hex: string; file: string }> }) {
  const { type, colour, hex, file } = await ctx.params;
  const view = /^(front|back|og)\.webp$/.exec(file)?.[1];
  if (!isGarmentType(type) || !/^[a-z0-9-]{1,80}$/.test(colour) || !/^[0-9a-f]{6}$/.test(hex) || !view) return new Response('Not found', { status: 404 });
  const neon = neonFor(colour);
  const svg = view === 'og' ? ogSceneSvg(type, colour, `#${hex}`, neon, SCENE_ASSETS) : productSceneSvg(type, view as 'front' | 'back', colour, `#${hex}`, neon, SCENE_ASSETS);
  const body = await sharp(Buffer.from(svg)).webp({ quality: 80, effort: 4 }).toBuffer();
  return new Response(new Uint8Array(body), {
    headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable', 'X-Content-Type-Options': 'nosniff' },
  });
}
