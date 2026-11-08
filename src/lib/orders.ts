import 'server-only';
import { db, newId, type Queryable, type Row } from './db';
import type { Order, OrderItem, PaymentMethod } from './types';
import { getSettings } from './catalog';
import { effectivePrice } from './utils';
import { ACTOR_CUSTOMER, ACTOR_SYSTEM, logActivity, logStock, syncOrderMoney, type StockKind } from './dashboard/ledger';

export function toOrder(r: Row): Order {
  return {
    id: r.id, number: r.number, customerId: r.customer_id, name: r.name, phone: r.phone, altPhone: r.alt_phone, email: r.email,
    governorate: r.governorate, city: r.city, address: r.address, notes: r.notes, items: r.items,
    subtotal: r.subtotal, discount: r.discount, shipping: r.shipping, total: r.total, promoCode: r.promo_code,
    paymentMethod: r.payment_method, paymentStatus: r.payment_status, paymentProof: r.payment_proof, paymentRef: r.payment_ref,
    status: r.status, history: r.history, locale: r.locale, createdAt: new Date(r.created_at).toISOString(),
  };
}

export interface CartLine { productId: string; colorId: string; size: string; qty: number }
export interface QuoteLine extends CartLine {
  slug: string; nameAr: string; nameEn: string; price: number; compareAt: number | null; image: string; colorAr: string; colorEn: string; available: number;
}
export type PromoError = 'invalid' | 'expired' | 'limit' | 'min' | 'first-order';
export interface Quote {
  lines: QuoteLine[]; subtotal: number; discount: number; shipping: number | null; total: number;
  freeShippingThreshold: number; promoCode: string | null; promoError: PromoError | null; promoMin?: number;
}

async function priceLines(q: Queryable, cart: CartLine[]): Promise<QuoteLine[]> {
  if (!cart.length) return [];
  const ids = [...new Set(cart.map((c) => c.productId))];
  const ph = ids.map((_, i) => `$${i + 1}`).join(',');
  const products = await q.query(`SELECT * FROM products WHERE id IN (${ph}) AND status = 'active'`, ids);
  const variants = await q.query(`SELECT * FROM product_variants WHERE product_id IN (${ph})`, ids);
  const lines: QuoteLine[] = [];
  for (const c of cart) {
    const p = products.find((x) => x.id === c.productId);
    if (!p) continue;
    const color = (p.colors as { id: string; nameAr: string; nameEn: string; images: string[] }[]).find((x) => x.id === c.colorId);
    const v = variants.find((x) => x.product_id === c.productId && x.color_id === c.colorId && x.size === c.size);
    if (!color || !v) continue;
    lines.push({
      ...c, slug: p.slug, nameAr: p.name_ar, nameEn: p.name_en,
      price: effectivePrice({ price: p.price, salePrice: p.sale_price }),
      compareAt: p.sale_price != null && p.sale_price < p.price ? p.price : null,
      image: color.images[0] ?? '', colorAr: color.nameAr, colorEn: color.nameEn, available: v.stock,
    });
  }
  return lines;
}

interface PromoResult { discount: number; code: string | null; error: PromoError | null; min?: number }
async function evalPromo(q: Queryable, code: string | undefined, subtotal: number, phone?: string): Promise<PromoResult> {
  const c = code?.trim().toUpperCase();
  if (!c) return { discount: 0, code: null, error: null };
  const [p] = await q.query('SELECT * FROM promo_codes WHERE code = $1 AND active = true', [c]);
  if (!p) return { discount: 0, code: null, error: 'invalid' };
  if (p.expires_at && new Date(p.expires_at) < new Date()) return { discount: 0, code: null, error: 'expired' };
  if (p.usage_limit != null && p.used_count >= p.usage_limit) return { discount: 0, code: null, error: 'limit' };
  if (subtotal < p.min_subtotal) return { discount: 0, code: null, error: 'min', min: p.min_subtotal };
  if (p.first_order_only && phone) {
    const [{ n }] = await q.query(`SELECT count(*)::int AS n FROM orders WHERE phone = $1 AND status <> 'cancelled'`, [phone]);
    if (n > 0) return { discount: 0, code: null, error: 'first-order' };
  }
  const discount = p.type === 'percent' ? Math.round((subtotal * p.value) / 100) : Math.min(p.value, subtotal);
  return { discount, code: c, error: null };
}

async function shippingFee(q: Queryable, governorate: string | undefined, afterDiscount: number, threshold: number) {
  if (!governorate) return null;
  if (afterDiscount >= threshold) return 0;
  const [r] = await q.query('SELECT fee FROM shipping_rates WHERE id = $1', [governorate]);
  return r ? (r.fee as number) : null;
}

/** Authoritative prices, stock, promo and shipping. The browser's cart is never trusted. */
export async function quoteCart(cart: CartLine[], opts: { promo?: string; governorate?: string; phone?: string }): Promise<Quote> {
  const { freeShippingThreshold } = await getSettings();
  const q: Queryable = { query: db.query };
  const lines = await priceLines(q, cart);
  const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
  const promo = await evalPromo(q, opts.promo, subtotal, opts.phone);
  const shipping = await shippingFee(q, opts.governorate, subtotal - promo.discount, freeShippingThreshold);
  return {
    lines, subtotal, discount: promo.discount, shipping, total: subtotal - promo.discount + (shipping ?? 0),
    freeShippingThreshold, promoCode: promo.code, promoError: promo.error, promoMin: promo.min,
  };
}

export class OrderError extends Error {
  constructor(public code: 'empty' | 'stock' | 'governorate' | 'promo', public detail?: string) { super(code); }
}

export interface PlaceOrderInput {
  customerId: string | null;
  name: string; phone: string; altPhone?: string; email?: string;
  governorate: string; city: string; address: string; notes?: string;
  paymentMethod: PaymentMethod; paymentProof?: string | null;
  promo?: string; lines: CartLine[]; locale: string;
}

/** One transaction: stock, promo usage and the order succeed or fail together, so concurrent buyers cannot oversell. */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const { freeShippingThreshold } = await getSettings();
  return db.tx(async (tx) => {
    const lines = await priceLines(tx, input.lines);
    if (!lines.length || lines.length !== input.lines.length) throw new OrderError('empty');
    const [{ n }] = await tx.query(`SELECT nextval('order_number_seq')::int AS n`);
    const number = `ZX${n}`;

    const items: OrderItem[] = [];
    for (const l of lines) {
      const updated = await tx.query(
        `UPDATE product_variants SET stock = stock - $1 WHERE product_id = $2 AND color_id = $3 AND size = $4 AND stock >= $1 RETURNING stock`,
        [l.qty, l.productId, l.colorId, l.size],
      );
      if (!updated.length) throw new OrderError('stock', input.locale === 'ar' ? l.nameAr : l.nameEn);
      // Stock is held from checkout so two buyers can never get the last piece; a cancel or return gives it back.
      await logStock(tx, { productId: l.productId, colorId: l.colorId, size: l.size, delta: -l.qty, kind: 'sale', ref: number, actor: ACTOR_CUSTOMER });
      await tx.query('UPDATE products SET sold_count = sold_count + $1 WHERE id = $2', [l.qty, l.productId]);
      const [p] = await tx.query('SELECT sku FROM products WHERE id = $1', [l.productId]);
      items.push({
        productId: l.productId, slug: l.slug, nameAr: l.nameAr, nameEn: l.nameEn, sku: p.sku, colorId: l.colorId,
        colorAr: l.colorAr, colorEn: l.colorEn, size: l.size, qty: l.qty, price: l.price, image: l.image,
      });
    }
    const subtotal = lines.reduce((a, l) => a + l.price * l.qty, 0);
    const promo = await evalPromo(tx, input.promo, subtotal, input.phone);
    if (input.promo?.trim() && promo.error) throw new OrderError('promo', promo.error);
    if (promo.code) {
      const used = await tx.query(`UPDATE promo_codes SET used_count = used_count + 1 WHERE code = $1 AND (usage_limit IS NULL OR used_count < usage_limit) RETURNING code`, [promo.code]);
      if (!used.length) throw new OrderError('promo', 'limit');
    }
    const shipping = await shippingFee(tx, input.governorate, subtotal - promo.discount, freeShippingThreshold);
    if (shipping == null) throw new OrderError('governorate');

    const total = subtotal - promo.discount + shipping;
    const now = new Date().toISOString();
    const [row] = await tx.query(
      `INSERT INTO orders (id,number,customer_id,name,phone,alt_phone,email,governorate,city,address,notes,items,subtotal,discount,shipping,total,promo_code,payment_method,payment_status,payment_proof,status,history,locale)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14,$15,$16,$17,$18,$19,$20,'pending',$21::jsonb,$22) RETURNING *`,
      [
        newId(), number, input.customerId, input.name, input.phone, input.altPhone || null, input.email || null, input.governorate, input.city, input.address, input.notes || null,
        JSON.stringify(items), subtotal, promo.discount, shipping, total, promo.code, input.paymentMethod,
        input.paymentProof ? 'proof-submitted' : 'unpaid', input.paymentProof ?? null, JSON.stringify([{ status: 'pending', at: now }]), input.locale,
      ],
    );
    return toOrder(row);
  });
}

export async function findOrderByNumber(number: string) {
  const rows = await db.query('SELECT * FROM orders WHERE number = $1', [number.trim().toUpperCase()]);
  return rows[0] ? toOrder(rows[0]) : null;
}

/** Statuses where the pieces are back on the shelf. Every other status holds them. */
const RESTOCKED = new Set(['cancelled', 'returned']);
const STAMP: Record<string, string> = { confirmed: 'confirmed_at', shipped: 'shipped_at', delivered: 'delivered_at', cancelled: 'closed_at', returned: 'closed_at' };

/**
 * Changes an order's status in one transaction: stock goes back on cancel/return (and is taken again if the
 * order is reopened), the status timestamp is set, the wallets are synced, and who/when is saved in the history and log.
 */
export async function setOrderStatus(id: string, status: string, opts: { note?: string; actor?: string } = {}) {
  const actor = opts.actor ?? ACTOR_SYSTEM;
  return db.tx(async (tx) => {
    const [o] = await tx.query('SELECT * FROM orders WHERE id = $1 FOR UPDATE', [id]);
    if (!o) return null;
    if (o.status === status) return toOrder(o);
    const items = o.items as OrderItem[];
    const wasBack = RESTOCKED.has(o.status), nowBack = RESTOCKED.has(status);
    if (!wasBack && nowBack) {
      for (const i of items) {
        await tx.query('UPDATE product_variants SET stock = stock + $1 WHERE product_id = $2 AND color_id = $3 AND size = $4', [i.qty, i.productId, i.colorId, i.size]);
        await tx.query('UPDATE products SET sold_count = GREATEST(sold_count - $1, 0) WHERE id = $2', [i.qty, i.productId]);
        await logStock(tx, { productId: i.productId, colorId: i.colorId, size: i.size, delta: i.qty, kind: status === 'returned' ? 'return' : 'cancel' as StockKind, ref: o.number, actor });
      }
    } else if (wasBack && !nowBack) {
      for (const i of items) {
        const r = await tx.query('UPDATE product_variants SET stock = stock - $1 WHERE product_id = $2 AND color_id = $3 AND size = $4 AND stock >= $1 RETURNING stock', [i.qty, i.productId, i.colorId, i.size]);
        if (!r.length) throw new OrderError('stock', i.nameAr);
        await tx.query('UPDATE products SET sold_count = sold_count + $1 WHERE id = $2', [i.qty, i.productId]);
        await logStock(tx, { productId: i.productId, colorId: i.colorId, size: i.size, delta: -i.qty, kind: 'reopen', ref: o.number, actor });
      }
    }
    const history = [...(o.history as object[]), { status, at: new Date().toISOString(), by: actor, ...(opts.note ? { note: opts.note } : {}) }];
    const stamp = STAMP[status];
    const [row] = await tx.query(
      `UPDATE orders SET status = $1, history = $2::jsonb${stamp ? `, ${stamp} = now()` : ''} WHERE id = $3 RETURNING *`,
      [status, JSON.stringify(history), id],
    );
    await syncOrderMoney(tx, id, actor);
    await logActivity(tx, actor, `غيّر الحالة من ${o.status} لـ ${status}`, 'order', id, { number: o.number, from: o.status, to: status, note: opts.note ?? null });
    return toOrder(row);
  });
}
