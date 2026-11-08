import 'server-only';
import { newId, type Queryable } from '../db';
import { DASHBOARD_CONFIG } from '../../../config/dashboard.config';

/** Who made a change. Orders placed on the site are "العميل"; Paymob callbacks are "Paymob". */
export const ACTOR_CUSTOMER = 'العميل (من الموقع)';
export const ACTOR_SYSTEM = 'النظام';

export type StockKind = 'sale' | 'cancel' | 'return' | 'reopen' | 'manual' | 'edit';

/** Records one stock change with the quantity after it, so the log can be read on its own. */
export async function logStock(q: Queryable, m: { productId: string; colorId: string; size: string; delta: number; kind: StockKind; reason?: string | null; ref?: string | null; actor: string }) {
  if (!m.delta) return;
  const [v] = await q.query<{ stock: number }>('SELECT stock FROM product_variants WHERE product_id = $1 AND color_id = $2 AND size = $3', [m.productId, m.colorId, m.size]);
  await q.query(
    `INSERT INTO stock_movements (id, product_id, color_id, size, delta, stock_after, kind, reason, ref, actor) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [newId(), m.productId, m.colorId, m.size, m.delta, v?.stock ?? null, m.kind, m.reason ?? null, m.ref ?? null, m.actor],
  );
}

/** Every change made from the dashboard (status, stock, expense, money) lands here with who and when. */
export async function logActivity(q: Queryable, actor: string, action: string, entity: string, entityId: string, details: Record<string, unknown> = {}) {
  await q.query('INSERT INTO activity_log (id, actor, action, entity, entity_id, details) VALUES ($1,$2,$3,$4,$5,$6::jsonb)', [newId(), actor, action, entity, entityId, JSON.stringify(details)]);
}

const PREPAID = new Set(['instapay', 'wallet', 'card']);

/**
 * Keeps the wallets in line with an order. The money an order should have produced is worked out from its
 * current state, compared with what was already posted, and only the difference is posted. Calling it twice is harmless.
 * - Cash on delivery: once delivered, the total sits with the courier ("فلوس عند شركة الشحن").
 * - Prepaid (InstaPay, wallet, card): once marked paid, the total lands in that method's wallet; a cancel or return reverses it.
 */
export async function syncOrderMoney(q: Queryable, orderId: string, actor: string) {
  const [o] = await q.query('SELECT id, number, total, status, payment_method, payment_status FROM orders WHERE id = $1', [orderId]);
  if (!o) return;
  const wallet = DASHBOARD_CONFIG.paymentWallet[o.payment_method] ?? 'cash';
  let expected = 0;
  if (o.payment_method === 'cod') expected = o.status === 'delivered' ? o.total : 0;
  else if (PREPAID.has(o.payment_method)) expected = o.payment_status === 'paid' && !['cancelled', 'returned'].includes(o.status) ? o.total : 0;
  const [{ posted }] = await q.query<{ posted: number }>(`SELECT COALESCE(sum(amount), 0)::int AS posted FROM wallet_movements WHERE kind = 'order' AND ref = $1 AND wallet = $2`, [o.id, wallet]);
  const diff = expected - posted;
  if (!diff) return;
  const note = diff > 0 ? `أوردر ${o.number}` : `رجوع فلوس أوردر ${o.number}`;
  await q.query(`INSERT INTO wallet_movements (id, wallet, amount, kind, ref, note, actor) VALUES ($1,$2,$3,'order',$4,$5,$6)`, [newId(), wallet, diff, o.id, note, actor]);
}

/** Short device label for the log, from the browser's user agent. Never stores the full string. */
export function deviceLabel(ua: string | null) {
  if (!ua) return '';
  if (/iPad|Tablet/i.test(ua)) return 'تابلت';
  if (/Mobile|Android|iPhone/i.test(ua)) return 'موبايل';
  return 'كمبيوتر';
}
