import { revalidatePath, revalidateTag } from 'next/cache';
import { currentActor, NO_STORE, ownerSession, sameOrigin, unauthorized } from '@/lib/dashboard/guard';
import { runAction } from '@/lib/dashboard/mutations';
import { dashLang } from '@/lib/dashboard/server-lang';
import { tr } from '@/lib/dashboard/lang';

export const dynamic = 'force-dynamic';

/** All dashboard writes (status, stock, expenses, money). Each one is logged with who and when. */
export async function POST(req: Request) {
  if (!(await ownerSession())) return unauthorized();
  if (!(await sameOrigin(req))) return Response.json({ error: 'forbidden' }, { status: 403, headers: NO_STORE });
  const lang = await dashLang();
  const body = (await req.json().catch(() => null)) as { action?: string; input?: unknown } | null;
  if (!body?.action) return Response.json({ ok: false, error: tr(lang, 'طلب ناقص', 'Incomplete request') }, { status: 400, headers: NO_STORE });
  const result = await runAction(body.action, body.input, await currentActor(), lang);
  if (result.ok && (body.action === 'orderStatus' || body.action === 'stockAdjust')) {
    // Stock changed: the store shows fresh "sold out" / "only N left" states.
    revalidateTag('catalog', { expire: 0 });
    revalidatePath('/[locale]', 'layout');
  }
  return Response.json(result, { status: result.ok ? 200 : 400, headers: NO_STORE });
}
