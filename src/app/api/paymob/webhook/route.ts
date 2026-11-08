import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPaymobHmac } from '@/lib/services';
import { logActivity, syncOrderMoney } from '@/lib/dashboard/ledger';

/** Paymob's server-to-server callback. Trusted only after the HMAC and the amount both check out. */
export async function POST(req: Request) {
  const hmac = new URL(req.url).searchParams.get('hmac') ?? '';
  const body = (await req.json().catch(() => null)) as { type?: string; obj?: Record<string, unknown> } | null;
  if (!body?.obj || body.type !== 'TRANSACTION' || !verifyPaymobHmac(body.obj, hmac)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 401 });
  }
  const obj = body.obj as { id: number; success: boolean; pending: boolean; amount_cents: number; order?: { merchant_order_id?: string }; special_reference?: string };
  const number = obj.special_reference || obj.order?.merchant_order_id;
  if (!number) return NextResponse.json({ ok: true });
  const [o] = await db.query('SELECT id, total FROM orders WHERE number = $1', [number]);
  if (!o) return NextResponse.json({ ok: true });
  const paid = obj.success === true && obj.pending === false && obj.amount_cents === o.total * 100;
  await db.tx(async (tx) => {
    await tx.query('UPDATE orders SET payment_status = $1, payment_ref = $2 WHERE id = $3', [paid ? 'paid' : 'failed', String(obj.id), o.id]);
    // A paid card order lands in its wallet in the dashboard.
    await syncOrderMoney(tx, o.id, 'Paymob');
    await logActivity(tx, 'Paymob', paid ? 'الدفع بالكارت نجح' : 'الدفع بالكارت فشل', 'order', o.id, { ref: String(obj.id) });
  });
  return NextResponse.json({ ok: true });
}
