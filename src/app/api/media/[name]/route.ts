import { readImage } from '@/lib/services';

/** Serves public uploaded images, from Vercel Blob in production. Names are random, so a file never changes. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const img = await readImage('public', (await params).name);
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img.body as BodyInit, { headers: { 'Content-Type': img.type, 'Cache-Control': 'public, max-age=31536000, s-maxage=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
}
