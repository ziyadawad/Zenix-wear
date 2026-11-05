import fs from 'node:fs/promises';
import path from 'node:path';
import { LOCAL_UPLOADS } from '@/lib/services';

/** Serves locally uploaded public images. Production uses Supabase Storage URLs instead. */
export async function GET(_: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return new Response('Not found', { status: 404 });
  try {
    const body = await fs.readFile(path.join(LOCAL_UPLOADS, 'public', name));
    const type = name.endsWith('png') ? 'image/png' : name.endsWith('webp') ? 'image/webp' : 'image/jpeg';
    return new Response(body, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
