import 'server-only';
import { z } from 'zod';
import { db, newId } from '../db';
import { OrderError, setOrderStatus } from '../orders';
import { DASHBOARD_CONFIG as C } from '../../../config/dashboard.config';
import { logActivity, logStock, syncOrderMoney } from './ledger';

export class ActionError extends Error {}

const walletIds = C.wallets.map((w) => w.id) as [string, ...string[]];
const statusIds = C.orderStatuses.map((s) => s.id) as [string, ...string[]];

const schemas = {
  orderStatus: z.object({ id: z.string().max(100), status: z.enum(statusIds), note: z.string().trim().max(300).optional() }),
  orderPaid: z.object({ id: z.string().max(100), paid: z.boolean() }),
  stockAdjust: z.object({
    productId: z.string().max(100), colorId: z.string().max(60), size: z.string().max(10),
    delta: z.number().int().min(-100000).max(100000).refine((n) => n !== 0, 'الكمية لازم تكون أكتر أو أقل من صفر'),
    reason: z.string().trim().min(3, 'اكتب السبب').max(300),
  }),
  expenseAdd: z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), category: z.enum(C.expenseCategories as unknown as [string, ...string[]]),
    amount: z.number().int().min(1).max(100000000), wallet: z.enum(walletIds), note: z.string().trim().max(300).optional(),
  }),
  expenseDelete: z.object({ id: z.string().max(100) }),
  moneyMove: z.object({
    type: z.enum(['in', 'out', 'transfer']), from: z.enum(walletIds).optional(), to: z.enum(walletIds).optional(),
    amount: z.number().int().min(1).max(100000000), note: z.string().trim().min(2, 'اكتب ملاحظة').max(300),
  }),
};
export type ActionName = keyof typeof schemas;

const walletName = (id: string) => C.wallets.find((w) => w.id === id)?.name ?? id;

export async function runAction(name: string, input: unknown, actor: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!(name in schemas)) return { ok: false, error: 'عملية مش معروفة' };
  const parsed = schemas[name as ActionName].safeParse(input);
  if (!parsed.success) {
    const m = parsed.error.issues[0]?.message ?? '';
    // Our own messages are Arabic; the library's English ones get a plain Arabic message instead.
    return { ok: false, error: /[؀-ۿ]/.test(m) ? m : 'البيانات مش مظبوطة، راجعها وجرب تاني' };
  }
  try {
    await handlers[name as ActionName](parsed.data as never, actor);
    return { ok: true };
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    if (e instanceof OrderError && e.code === 'stock') return { ok: false, error: `مفيش مخزون كفاية من ${e.detail} عشان ترجّع الأوردر ده` };
    console.error(`[dashboard] action "${name}" failed:`, e instanceof Error ? e.message : 'unknown error');
    return { ok: false, error: 'حصلت مشكلة، جرّب تاني' };
  }
}

const handlers: { [K in ActionName]: (d: z.infer<(typeof schemas)[K]>, actor: string) => Promise<void> } = {
  async orderStatus(d, actor) {
    const o = await setOrderStatus(d.id, d.status, { note: d.note, actor });
    if (!o) throw new ActionError('الأوردر مش موجود');
  },

  async orderPaid(d, actor) {
    await db.tx(async (tx) => {
      const [o] = await tx.query('UPDATE orders SET payment_status = $1 WHERE id = $2 RETURNING number', [d.paid ? 'paid' : 'unpaid', d.id]);
      if (!o) throw new ActionError('الأوردر مش موجود');
      await syncOrderMoney(tx, d.id, actor);
      await logActivity(tx, actor, d.paid ? 'اتعلّم مدفوع' : 'اتعلّم مش مدفوع', 'order', d.id, { number: o.number });
    });
  },

  async stockAdjust(d, actor) {
    await db.tx(async (tx) => {
      const r = await tx.query('UPDATE product_variants SET stock = stock + $1 WHERE product_id = $2 AND color_id = $3 AND size = $4 AND stock + $1 >= 0 RETURNING stock', [d.delta, d.productId, d.colorId, d.size]);
      if (!r.length) throw new ActionError('المخزون مينفعش يبقى أقل من صفر');
      await logStock(tx, { ...d, kind: 'manual', actor });
      await logActivity(tx, actor, d.delta > 0 ? 'زوّد مخزون' : 'نقّص مخزون', 'product', d.productId, { color: d.colorId, size: d.size, delta: d.delta, reason: d.reason, after: r[0].stock });
    });
  },

  async expenseAdd(d, actor) {
    await db.tx(async (tx) => {
      const id = newId();
      await tx.query('INSERT INTO expenses (id, spent_on, category, amount, wallet, note, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)', [id, d.date, d.category, d.amount, d.wallet, d.note || null, actor]);
      await tx.query(`INSERT INTO wallet_movements (id, wallet, amount, kind, ref, note, actor) VALUES ($1,$2,$3,'expense',$4,$5,$6)`, [newId(), d.wallet, -d.amount, id, `مصروف: ${d.category}${d.note ? ` (${d.note})` : ''}`, actor]);
      await logActivity(tx, actor, 'سجّل مصروف', 'expense', id, d);
    });
  },

  async expenseDelete(d, actor) {
    await db.tx(async (tx) => {
      const [e] = await tx.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [d.id]);
      if (!e) throw new ActionError('المصروف مش موجود');
      await tx.query(`DELETE FROM wallet_movements WHERE kind = 'expense' AND ref = $1`, [d.id]);
      await logActivity(tx, actor, 'مسح مصروف', 'expense', d.id, { category: e.category, amount: e.amount, wallet: e.wallet, date: e.spent_on });
    });
  },

  async moneyMove(d, actor) {
    if (d.type !== 'in' && !d.from) throw new ActionError('اختار المحفظة اللي الفلوس طالعة منها');
    if (d.type !== 'out' && !d.to) throw new ActionError('اختار المحفظة اللي الفلوس داخلة فيها');
    if (d.type === 'transfer' && d.from === d.to) throw new ActionError('اختار محفظتين مختلفين');
    await db.tx(async (tx) => {
      const ref = newId();
      const label = d.type === 'transfer' ? `تحويل من ${walletName(d.from!)} لـ ${walletName(d.to!)}: ${d.note}` : d.note;
      if (d.from) await tx.query(`INSERT INTO wallet_movements (id, wallet, amount, kind, ref, note, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [newId(), d.from, -d.amount, d.type === 'transfer' ? 'transfer' : 'manual', ref, label, actor]);
      if (d.to) await tx.query(`INSERT INTO wallet_movements (id, wallet, amount, kind, ref, note, actor) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [newId(), d.to, d.amount, d.type === 'transfer' ? 'transfer' : 'manual', ref, label, actor]);
      await logActivity(tx, actor, d.type === 'in' ? 'دخّل فلوس' : d.type === 'out' ? 'طلّع فلوس' : 'حوّل فلوس', 'wallet', d.to ?? d.from!, d);
    });
  },
};
