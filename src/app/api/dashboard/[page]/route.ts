import { NO_STORE, ownerSession, unauthorized } from '@/lib/dashboard/guard';
import { dashLang } from '@/lib/dashboard/server-lang';
import { customerOrders, customers, money, orderDetail, orders, overview, products, stock, stockLog, walletDetail } from '@/lib/dashboard/queries';

export const dynamic = 'force-dynamic';

/** All dashboard reads. Nothing is returned without a valid owner session. */
export async function GET(req: Request, ctx: RouteContext<'/api/dashboard/[page]'>) {
  if (!(await ownerSession())) return unauthorized();
  const { page } = await ctx.params;
  const lang = await dashLang();
  const sp = new URL(req.url).searchParams;
  const get = (k: string) => (sp.get(k) ?? '').slice(0, 100);
  const json = (data: unknown) => Response.json({ at: new Date().toISOString(), data }, { headers: NO_STORE });
  try {
    switch (page) {
      case 'overview': return json(await overview());
      case 'orders': return json(await orders(get('q'), lang));
      case 'stock': return json(await stock(lang));
      case 'money': return json(await money({ month: get('month'), category: get('category'), wallet: get('wallet') }, lang));
      case 'products': return json(await products(lang));
      case 'customers': return json(await customers(lang));
      case 'order': return json(await orderDetail(get('id'), lang));
      case 'stock-log': return json(await stockLog(get('id')));
      case 'wallet': return json(await walletDetail(get('id'), get('range')));
      case 'customer': return json(await customerOrders(get('phone'), lang));
      default: return Response.json({ error: 'not found' }, { status: 404, headers: NO_STORE });
    }
  } catch (e) {
    console.error(`[dashboard] GET ${page} failed:`, e instanceof Error ? e.message : 'unknown error');
    return Response.json({ error: 'failed' }, { status: 503, headers: NO_STORE });
  }
}
