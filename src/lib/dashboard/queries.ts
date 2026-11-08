import 'server-only';
import { db } from '../db';
import { DASHBOARD_CONFIG as C } from '../../../config/dashboard.config';
import { normalizePhone } from '../utils';

// ---- Time: every "today" and "this month" is Cairo time -----------------------------------------
const NOW = `(now() AT TIME ZONE 'Africa/Cairo')`;
const loc = (col: string) => `(${col} AT TIME ZONE 'Africa/Cairo')`;
const TODAY = `date_trunc('day', ${NOW})`;
const MONTH = `date_trunc('month', ${NOW})`;
/** Orders that count as a sale: placed and not cancelled or returned. */
const SALE = `status NOT IN ('cancelled','returned')`;

export type Section<T> = { ok: true; data: T } | { ok: false };

/** Runs one card's query. A failure is logged (message only, never secrets) and reported as "not connected" for that card alone. */
async function section<T>(name: string, fn: () => Promise<T>): Promise<Section<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    console.error(`[dashboard] "${name}" failed:`, e instanceof Error ? e.message : 'unknown error');
    return { ok: false };
  }
}
async function sections<T extends Record<string, () => Promise<unknown>>>(defs: T) {
  const entries = await Promise.all(Object.entries(defs).map(async ([k, fn]) => [k, await section(k, fn)] as const));
  return Object.fromEntries(entries) as { [K in keyof T]: Section<Awaited<ReturnType<T[K]>>> };
}

const lowMin = (slug: string) => C.lowStock.perProduct[slug] ?? C.lowStock.default;

// ---- Shared: profit this month -------------------------------------------------------------------
export async function monthProfit() {
  const [s] = await db.query(`SELECT COALESCE(sum(total),0)::int AS sales, count(*)::int AS n FROM orders WHERE status = 'delivered' AND ${loc('delivered_at')} >= ${MONTH}`);
  const [g] = await db.query(`
    SELECT COALESCE(sum((i->>'qty')::int * p.cost_price),0)::int AS cogs,
           COALESCE(sum((i->>'qty')::int) FILTER (WHERE p.cost_price IS NULL),0)::int AS missing
    FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items) i LEFT JOIN products p ON p.id = i->>'productId'
    WHERE o.status = 'delivered' AND ${loc('o.delivered_at')} >= ${MONTH}`);
  const [sh] = await db.query(`
    SELECT COALESCE(sum(COALESCE(o.shipping_cost, r.fee, 0)),0)::int AS shipping
    FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate
    WHERE (o.status = 'delivered' AND ${loc('o.delivered_at')} >= ${MONTH})
       OR (o.status = 'returned' AND o.shipped_at IS NOT NULL AND ${loc('o.closed_at')} >= ${MONTH})`);
  const [e] = await db.query(`SELECT COALESCE(sum(amount),0)::int AS expenses FROM expenses WHERE spent_on >= (${MONTH})::date`);
  return { sales: s.sales as number, delivered: s.n as number, cogs: g.cogs as number, missingCostPieces: g.missing as number, shipping: sh.shipping as number, expenses: e.expenses as number, net: s.sales - g.cogs - sh.shipping - e.expenses };
}

// ---- 1) Overview ---------------------------------------------------------------------------------
export function overview() {
  return sections({
    today: async () => {
      const w = (from: string, to: string) => `${loc('created_at')} >= ${from} AND ${loc('created_at')} < ${to}`;
      const [r] = await db.query(`
        SELECT
          COALESCE(sum(total) FILTER (WHERE ${w(TODAY, NOW)}),0)::int AS sales, count(*) FILTER (WHERE ${w(TODAY, NOW)})::int AS n,
          COALESCE(sum(total) FILTER (WHERE ${w(`${TODAY} - interval '1 day'`, `${NOW} - interval '1 day'`)}),0)::int AS y_sales,
          count(*) FILTER (WHERE ${w(`${TODAY} - interval '1 day'`, `${NOW} - interval '1 day'`)})::int AS y_n,
          COALESCE(sum(total) FILTER (WHERE ${w(`${TODAY} - interval '7 days'`, `${NOW} - interval '7 days'`)}),0)::int AS w_sales,
          count(*) FILTER (WHERE ${w(`${TODAY} - interval '7 days'`, `${NOW} - interval '7 days'`)})::int AS w_n
        FROM orders WHERE ${SALE} AND created_at > now() - interval '9 days'`);
      const list = await db.query(`SELECT id, number, name, total, status, created_at FROM orders WHERE ${SALE} AND ${loc('created_at')} >= ${TODAY} ORDER BY created_at DESC LIMIT 100`);
      return { sales: r.sales, orders: r.n, aov: r.n ? Math.round(r.sales / r.n) : 0, yesterday: { sales: r.y_sales, orders: r.y_n }, lastWeek: { sales: r.w_sales, orders: r.w_n }, list };
    },
    month: async () => {
      const [r] = await db.query(`SELECT COALESCE(sum(total),0)::int AS sales, count(*)::int AS n FROM orders WHERE ${SALE} AND ${loc('created_at')} >= ${MONTH}`);
      const days = await db.query(`
        SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(sum(o.total),0)::int AS sales, count(o.id)::int AS n
        FROM generate_series(${MONTH}, ${TODAY}, interval '1 day') d
        LEFT JOIN orders o ON date_trunc('day', ${loc('o.created_at')}) = d AND o.${SALE}
        GROUP BY d ORDER BY d DESC`);
      return { sales: r.sales, orders: r.n, target: C.monthlySalesTarget, days };
    },
    needsConfirm: async () => {
      const list = await db.query(`SELECT id, number, name, phone, total, created_at, (extract(epoch FROM now() - created_at) / 3600)::float8 AS hours FROM orders WHERE status = 'pending' ORDER BY created_at LIMIT 100`);
      return { count: list.length, overdue: list.filter((o) => o.hours > C.late.unconfirmedHours).length, limitHours: C.late.unconfirmedHours, list };
    },
    chart: async () => db.query(`
      SELECT to_char(d, 'YYYY-MM-DD') AS day, COALESCE(sum(o.total),0)::int AS sales, count(o.id)::int AS n
      FROM generate_series(${TODAY} - interval '29 days', ${TODAY}, interval '1 day') d
      LEFT JOIN orders o ON date_trunc('day', ${loc('o.created_at')}) = d AND o.${SALE}
      GROUP BY d ORDER BY d`),
    profit: monthProfit,
  });
}

// ---- 2) Orders -----------------------------------------------------------------------------------
export function orders(q: string) {
  return sections({
    counts: async () => {
      const rows = await db.query('SELECT status, count(*)::int AS n FROM orders GROUP BY status');
      return Object.fromEntries(C.orderStatuses.map((s) => [s.id, rows.find((r) => r.status === s.id)?.n ?? 0])) as Record<string, number>;
    },
    late: async () => db.query(`
      SELECT o.id, o.number, o.name, o.phone, o.status, o.total, r.name_ar AS governorate,
        CASE WHEN o.status = 'shipped' THEN o.shipped_at ELSE COALESCE(o.confirmed_at, o.created_at) END AS since,
        (extract(epoch FROM now() - CASE WHEN o.status = 'shipped' THEN o.shipped_at ELSE COALESCE(o.confirmed_at, o.created_at) END) / 86400)::float8 AS days
      FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate
      WHERE (o.status IN ('confirmed','preparing') AND COALESCE(o.confirmed_at, o.created_at) < now() - ($1 || ' days')::interval)
         OR (o.status = 'shipped' AND COALESCE(o.shipped_at, o.created_at) < now() - ($2 || ' days')::interval)
      ORDER BY since LIMIT 100`, [String(C.late.confirmedDays), String(C.late.shippedDays)]),
    latest: async () => {
      const params: unknown[] = [];
      let where = '';
      if (q.trim()) {
        params.push(`%${q.trim().toUpperCase()}%`, `%${normalizePhone(q)}%`);
        where = 'WHERE o.number ILIKE $1 OR o.phone LIKE $2 OR o.alt_phone LIKE $2';
      }
      return db.query(`SELECT o.id, o.number, o.name, o.phone, r.name_ar AS governorate, o.total, o.payment_method, o.payment_status, o.status, o.created_at
        FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate ${where} ORDER BY o.created_at DESC LIMIT 60`, params);
    },
    rates: async () => {
      const [r] = await db.query(`SELECT count(*)::int AS n, count(*) FILTER (WHERE status = 'cancelled')::int AS c, count(*) FILTER (WHERE status = 'returned')::int AS r FROM orders WHERE ${loc('created_at')} >= ${MONTH}`);
      return { total: r.n, cancelled: r.c, returned: r.r, cancelRate: r.n ? r.c / r.n : 0, returnRate: r.n ? r.r / r.n : 0 };
    },
  });
}

export async function orderDetail(id: string) {
  const [o] = await db.query(`SELECT o.*, r.name_ar AS governorate_name, COALESCE(o.shipping_cost, r.fee) AS ship_cost FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate WHERE o.id = $1`, [id]);
  if (!o) return null;
  const log = await db.query(`SELECT actor, action, details, created_at FROM activity_log WHERE entity = 'order' AND entity_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]);
  return {
    id: o.id, number: o.number, name: o.name, phone: o.phone, altPhone: o.alt_phone, email: o.email, governorate: o.governorate_name ?? o.governorate,
    city: o.city, address: o.address, notes: o.notes, items: o.items, subtotal: o.subtotal, discount: o.discount, shipping: o.shipping, total: o.total,
    promoCode: o.promo_code, paymentMethod: o.payment_method, paymentStatus: o.payment_status, status: o.status, history: o.history,
    createdAt: o.created_at, shippingCost: o.ship_cost, log,
  };
}

// ---- 3) Stock ------------------------------------------------------------------------------------
export function stock() {
  return sections({
    products: async () => {
      const products = await db.query(`SELECT id, slug, name_ar, colors, price, sale_price, cost_price, status FROM products ORDER BY status, name_ar`);
      const variants = await db.query('SELECT product_id, color_id, size, stock FROM product_variants');
      const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'ONE'];
      return products.map((p) => {
        const vs = variants.filter((v) => v.product_id === p.id);
        const sizes = [...new Set(vs.map((v) => v.size as string))].sort((a, b) => order.indexOf(a) - order.indexOf(b));
        const min = lowMin(p.slug);
        const colors = (p.colors as { id: string; nameAr: string; hex: string; images: string[] }[]).map((c) => ({ id: c.id, name: c.nameAr, hex: c.hex, cells: sizes.map((s) => vs.find((v) => v.color_id === c.id && v.size === s)?.stock ?? null) }));
        const total = vs.reduce((a, v) => a + v.stock, 0);
        const low = vs.filter((v) => v.stock < min).length;
        return { id: p.id, slug: p.slug, name: p.name_ar, image: p.colors[0]?.images?.[0] ?? null, live: p.status === 'active', price: p.sale_price ?? p.price, cost: p.cost_price, min, sizes, colors, total, low, out: vs.filter((v) => v.stock === 0).length };
      });
    },
    totals: async () => {
      const [r] = await db.query(`
        SELECT COALESCE(sum(v.stock),0)::int AS pieces,
               COALESCE(sum(v.stock * p.cost_price),0)::int AS at_cost,
               COALESCE(sum(v.stock) FILTER (WHERE p.cost_price IS NULL),0)::int AS no_cost,
               COALESCE(sum(v.stock * COALESCE(p.sale_price, p.price)),0)::int AS at_price
        FROM product_variants v JOIN products p ON p.id = v.product_id`);
      return { pieces: r.pieces, atCost: r.at_cost, atPrice: r.at_price, piecesWithoutCost: r.no_cost };
    },
  });
}
export const stockLog = (productId: string) =>
  db.query(`SELECT color_id, size, delta, stock_after, kind, reason, ref, actor, created_at FROM stock_movements WHERE product_id = $1 ORDER BY created_at DESC LIMIT 200`, [productId]);

// ---- 4) Money ------------------------------------------------------------------------------------
export function money(filter: { month?: string; category?: string; wallet?: string }) {
  return sections({
    wallets: async () => {
      const rows = await db.query(`
        SELECT wallet, COALESCE(sum(amount),0)::int AS balance,
          COALESCE(sum(amount) FILTER (WHERE amount > 0 AND ${loc('created_at')} >= ${TODAY}),0)::int AS in_today,
          COALESCE(-sum(amount) FILTER (WHERE amount < 0 AND ${loc('created_at')} >= ${TODAY}),0)::int AS out_today
        FROM wallet_movements GROUP BY wallet`);
      const last = await db.query(`SELECT DISTINCT ON (wallet) wallet, amount, note, created_at FROM wallet_movements ORDER BY wallet, created_at DESC`);
      return C.wallets.map((w) => {
        const r = rows.find((x) => x.wallet === w.id);
        return { id: w.id, name: w.name, balance: r?.balance ?? 0, inToday: r?.in_today ?? 0, outToday: r?.out_today ?? 0, last: last.find((x) => x.wallet === w.id) ?? null };
      });
    },
    profit: monthProfit,
    expenses: async () => {
      const month = /^\d{4}-\d{2}$/.test(filter.month ?? '') ? filter.month! : null;
      const where = [month ? `to_char(spent_on, 'YYYY-MM') = $1` : `spent_on >= (${MONTH})::date`];
      const params: unknown[] = month ? [month] : [];
      if (filter.category) { params.push(filter.category); where.push(`category = $${params.length}`); }
      if (filter.wallet) { params.push(filter.wallet); where.push(`wallet = $${params.length}`); }
      const list = await db.query(`SELECT id, to_char(spent_on, 'YYYY-MM-DD') AS date, category, amount, wallet, note, actor, created_at FROM expenses WHERE ${where.join(' AND ')} ORDER BY spent_on DESC, created_at DESC LIMIT 300`, params);
      const byCategory: Record<string, number> = {};
      for (const e of list) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
      return { list, total: list.reduce((a, e) => a + e.amount, 0), byCategory };
    },
  });
}

/** One wallet's movements in a range, grouped by Cairo day with opening and closing balances. */
export async function walletDetail(wallet: string, range: string) {
  let from: string; let to = `${TODAY} + interval '1 day'`; const params: unknown[] = [wallet];
  if (range === 'today') from = TODAY;
  else if (range === '7d') from = `${TODAY} - interval '6 days'`;
  else if (/^\d{4}-\d{2}$/.test(range)) { params.push(`${range}-01`); from = `($2)::timestamp`; to = `($2)::timestamp + interval '1 month'`; }
  else from = MONTH;
  const [{ opening }] = await db.query(`SELECT COALESCE(sum(amount),0)::int AS opening FROM wallet_movements WHERE wallet = $1 AND ${loc('created_at')} < ${from}`, params);
  const rows = await db.query(`SELECT to_char(${loc('created_at')}, 'YYYY-MM-DD') AS day, amount, kind, note, actor, created_at FROM wallet_movements WHERE wallet = $1 AND ${loc('created_at')} >= ${from} AND ${loc('created_at')} < ${to} ORDER BY created_at`, params);
  const days: { day: string; opening: number; closing: number; in: number; out: number; moves: typeof rows }[] = [];
  let bal = opening as number;
  for (const r of rows) {
    let d = days[days.length - 1];
    if (!d || d.day !== r.day) { d = { day: r.day, opening: bal, closing: bal, in: 0, out: 0, moves: [] }; days.push(d); }
    bal += r.amount; d.closing = bal; d.moves.push(r);
    if (r.amount > 0) d.in += r.amount; else d.out -= r.amount;
  }
  return { opening, closing: bal, days: days.reverse() };
}

// ---- 5) Products performance ---------------------------------------------------------------------
export function products() {
  const ITEMS = `FROM orders o CROSS JOIN LATERAL jsonb_array_elements(o.items) i`;
  const THIS_MONTH = `o.${SALE} AND ${loc('o.created_at')} >= ${MONTH}`;
  return sections({
    best: async () => db.query(`SELECT i->>'productId' AS id, max(i->>'nameAr') AS name, sum((i->>'qty')::int)::int AS pieces, sum((i->>'qty')::int * (i->>'price')::int)::int AS money ${ITEMS} WHERE ${THIS_MONTH} GROUP BY 1 ORDER BY pieces DESC, money DESC LIMIT 10`),
    slow: async () => db.query(`
      SELECT p.id, p.name_ar AS name, COALESCE(s.pieces,0)::int AS pieces, COALESCE(s.money,0)::int AS money, (SELECT COALESCE(sum(stock),0)::int FROM product_variants v WHERE v.product_id = p.id) AS stock
      FROM products p LEFT JOIN (SELECT i->>'productId' AS id, sum((i->>'qty')::int) AS pieces, sum((i->>'qty')::int * (i->>'price')::int) AS money ${ITEMS} WHERE ${THIS_MONTH} GROUP BY 1) s ON s.id = p.id
      WHERE p.status = 'active' ORDER BY pieces, stock DESC LIMIT 10`),
    sizes: async () => db.query(`SELECT i->>'size' AS label, sum((i->>'qty')::int)::int AS pieces ${ITEMS} WHERE ${THIS_MONTH} GROUP BY 1 ORDER BY pieces DESC`),
    colors: async () => db.query(`SELECT i->>'colorAr' AS label, sum((i->>'qty')::int)::int AS pieces ${ITEMS} WHERE ${THIS_MONTH} GROUP BY 1 ORDER BY pieces DESC LIMIT 12`),
    returns: async () => db.query(`
      SELECT i->>'productId' AS id, max(i->>'nameAr') AS name,
        sum((i->>'qty')::int) FILTER (WHERE o.status = 'returned')::int AS returned,
        sum((i->>'qty')::int) FILTER (WHERE o.status IN ('delivered','returned'))::int AS closed
      ${ITEMS} WHERE o.status IN ('delivered','returned') GROUP BY 1 ORDER BY 3 DESC NULLS LAST, 4 DESC LIMIT 30`),
    promos: async () => db.query(`
      SELECT p.code, p.active, p.type, p.value,
        count(o.id) FILTER (WHERE o.status <> 'cancelled')::int AS uses,
        COALESCE(sum(o.discount) FILTER (WHERE o.status <> 'cancelled'),0)::int AS discount,
        count(o.id) FILTER (WHERE o.status <> 'cancelled' AND ${loc('o.created_at')} >= ${MONTH})::int AS uses_month
      FROM promo_codes p LEFT JOIN orders o ON o.promo_code = p.code GROUP BY p.code ORDER BY uses DESC, p.code`),
  });
}

// ---- 6) Customers --------------------------------------------------------------------------------
export function customers() {
  return sections({
    newVsReturning: async () => {
      const [r] = await db.query(`
        WITH firsts AS (SELECT phone, min(created_at) AS first_at FROM orders WHERE status <> 'cancelled' GROUP BY phone),
             month AS (SELECT DISTINCT phone FROM orders WHERE status <> 'cancelled' AND ${loc('created_at')} >= ${MONTH})
        SELECT count(*) FILTER (WHERE ${loc('f.first_at')} >= ${MONTH})::int AS new, count(*) FILTER (WHERE ${loc('f.first_at')} < ${MONTH})::int AS returning
        FROM month m JOIN firsts f ON f.phone = m.phone`);
      return { new: r.new, returning: r.returning };
    },
    governorates: async () => db.query(`
      SELECT COALESCE(r.name_ar, o.governorate) AS name, count(*)::int AS orders, COALESCE(sum(o.total),0)::int AS sales
      FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate WHERE o.${SALE} AND ${loc('o.created_at')} >= ${MONTH}
      GROUP BY 1 ORDER BY orders DESC, sales DESC LIMIT 12`),
    top: async () => db.query(`
      SELECT phone, (array_agg(name ORDER BY created_at DESC))[1] AS name, count(*) FILTER (WHERE ${SALE})::int AS orders,
        COALESCE(sum(total) FILTER (WHERE ${SALE}),0)::int AS spent, max(created_at) AS last_at
      FROM orders GROUP BY phone HAVING count(*) FILTER (WHERE ${SALE}) > 0 ORDER BY spent DESC LIMIT 20`),
    flagged: async () => db.query(`
      SELECT phone, (array_agg(name ORDER BY created_at DESC))[1] AS name, count(*)::int AS orders,
        count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled, count(*) FILTER (WHERE status = 'returned')::int AS returned
      FROM orders GROUP BY phone HAVING count(*) FILTER (WHERE status IN ('cancelled','returned')) >= $1
      ORDER BY count(*) FILTER (WHERE status IN ('cancelled','returned')) DESC LIMIT 50`, [C.risk.badOrders]),
  });
}

export const customerOrders = (phone: string) =>
  db.query(`SELECT o.id, o.number, o.total, o.status, o.payment_method, o.created_at, r.name_ar AS governorate FROM orders o LEFT JOIN shipping_rates r ON r.id = o.governorate WHERE o.phone = $1 ORDER BY o.created_at DESC LIMIT 100`, [normalizePhone(phone)]);
