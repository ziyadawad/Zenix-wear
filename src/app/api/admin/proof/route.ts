import { isAdmin } from '@/lib/auth';
import { readImage } from '@/lib/services';

/** Payment screenshots hold personal data, so they are only ever served to the logged-in owner. */
export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response('Unauthorized', { status: 401 });
  const ref = new URL(req.url).searchParams.get('ref') ?? '';
  const img = await readImage('private', ref.replace(/^private:/, ''));
  if (!img) return new Response('Not found', { status: 404 });
  return new Response(img.body as BodyInit, { headers: { 'Content-Type': img.type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
}
