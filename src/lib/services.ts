import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { get, put } from '@vercel/blob';
import type { Order } from './types';
import { formatMoney, SITE_URL } from './utils';

// ---- Image storage ----------------------------------------------------------------------------
// Local: .data/uploads. Production: one private Vercel Blob store (access is fixed per store, and
// payment screenshots must never be public). Both serve through this app: /api/media for public
// images, the admin-only proof route for private ones. The folder keeps the two apart.
const MAX_BYTES = 5 * 1024 * 1024;
const LOCAL_UPLOADS = path.join(process.cwd(), '.data', 'uploads');
export type ImageVisibility = 'public' | 'private';
export const blobConfigured = () => !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Checks the file's real signature. The browser-supplied type and name are never trusted, and SVG is refused. */
function sniffImage(b: Buffer): { ext: string; type: string } | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', type: 'image/jpeg' };
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: 'png', type: 'image/png' };
  if (b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return { ext: 'webp', type: 'image/webp' };
  return null;
}

export class UploadError extends Error {}

/** `visibility: 'private'` is for payment screenshots: they are only readable through the admin-only route. */
export async function saveImage(file: File, visibility: ImageVisibility): Promise<string> {
  if (!file || file.size === 0) throw new UploadError('empty');
  if (file.size > MAX_BYTES) throw new UploadError('too-large');
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniffImage(buf);
  if (!kind) throw new UploadError('bad-type');
  const name = `${crypto.randomUUID()}.${kind.ext}`;

  if (blobConfigured()) {
    await put(`${visibility}/${name}`, buf, { access: 'private', contentType: kind.type, addRandomSuffix: false });
  } else {
    if (process.env.VERCEL) throw new UploadError('storage-not-configured');
    const dir = path.join(LOCAL_UPLOADS, visibility);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
  }
  return visibility === 'public' ? `/api/media/${name}` : `private:${name}`;
}

export async function readImage(visibility: ImageVisibility, name: string): Promise<{ body: Uint8Array; type: string } | null> {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(name)) return null;
  const type = name.endsWith('png') ? 'image/png' : name.endsWith('webp') ? 'image/webp' : 'image/jpeg';
  if (blobConfigured()) {
    const res = await get(`${visibility}/${name}`, { access: 'private' });
    return res?.statusCode === 200 ? { body: new Uint8Array(await new Response(res.stream).arrayBuffer()), type } : null;
  }
  try {
    return { body: await fs.readFile(path.join(LOCAL_UPLOADS, visibility, name)), type };
  } catch {
    return null;
  }
}

// ---- Email ------------------------------------------------------------------------------------
export const emailConfigured = () => !!process.env.RESEND_API_KEY;
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!process.env.RESEND_API_KEY) {
    console.warn(`[email] RESEND_API_KEY is not set, so this was not sent: "${subject}" to ${to}`);
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM || 'ZENIX WEAR <onboarding@resend.dev>', to, subject, html }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error('[email] Resend rejected the message', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('[email] send failed', e);
    return false;
  }
}

export async function notifyNewOrder(o: Order) {
  const to = process.env.ORDER_NOTIFY_EMAIL || 'ziyadawad14@gmail.com';
  const rows = o.items.map((i) =>
    `<tr><td style="padding:8px 0;border-bottom:1px solid #eee">${esc(i.nameEn)}<br><small>${esc(i.colorEn)} / ${esc(i.size)} / SKU ${esc(i.sku)}</small></td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">x${i.qty}</td><td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatMoney(i.price * i.qty, 'en')}</td></tr>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111">
  <h2 style="letter-spacing:3px;font-weight:400">ZENIX WEAR</h2>
  <p><strong>New order ${esc(o.number)}</strong>: ${formatMoney(o.total, 'en')} (${esc(o.paymentMethod.toUpperCase())})</p>
  <p>${esc(o.name)}<br>${esc(o.phone)}${o.altPhone ? ` / ${esc(o.altPhone)}` : ''}<br>${esc(o.address)}, ${esc(o.city)}, ${esc(o.governorate)}</p>
  ${o.notes ? `<p><em>${esc(o.notes)}</em></p>` : ''}
  <table style="width:100%;border-collapse:collapse;font-size:14px">${rows}</table>
  <p style="text-align:right">Subtotal ${formatMoney(o.subtotal, 'en')}<br>Discount ${formatMoney(o.discount, 'en')}<br>Shipping ${formatMoney(o.shipping, 'en')}<br><strong>Total ${formatMoney(o.total, 'en')}</strong></p>
  <p><a href="${SITE_URL}/admin/orders/${o.id}" style="background:#000;color:#fff;padding:12px 22px;text-decoration:none;display:inline-block">Open order</a></p></div>`;
  return sendEmail(to, `New order ${o.number}: ${formatMoney(o.total, 'en')}`, html);
}

// ---- Paymob -----------------------------------------------------------------------------------
export const paymobEnabled = () =>
  !!(process.env.PAYMOB_SECRET_KEY && process.env.PAYMOB_PUBLIC_KEY && process.env.PAYMOB_INTEGRATION_ID && process.env.PAYMOB_HMAC_SECRET);

/** Creates a Paymob payment intention and returns the hosted checkout URL. */
export async function createPaymobCheckout(o: Order, redirectUrl: string): Promise<string> {
  const [first, ...rest] = o.name.trim().split(/\s+/);
  const res = await fetch('https://accept.paymob.com/v1/intention/', {
    method: 'POST',
    headers: { Authorization: `Token ${process.env.PAYMOB_SECRET_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: o.total * 100,
      currency: 'EGP',
      payment_methods: [Number(process.env.PAYMOB_INTEGRATION_ID)],
      items: [{ name: `ZENIX order ${o.number}`, amount: o.total * 100, description: `Order ${o.number}`, quantity: 1 }],
      billing_data: {
        first_name: first || 'NA', last_name: rest.join(' ') || 'NA', phone_number: `+2${o.phone}`, email: o.email || 'na@na.com',
        apartment: 'NA', floor: 'NA', building: 'NA', street: o.address.slice(0, 200), city: o.city, country: 'EG', state: o.governorate, shipping_method: 'NA', postal_code: 'NA',
      },
      special_reference: o.number,
      notification_url: `${SITE_URL}/api/paymob/webhook`,
      redirection_url: redirectUrl,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Paymob intention failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { client_secret: string };
  return `https://accept.paymob.com/unifiedcheckout/?publicKey=${encodeURIComponent(process.env.PAYMOB_PUBLIC_KEY!)}&clientSecret=${encodeURIComponent(data.client_secret)}`;
}

/** Verifies Paymob's transaction callback signature (HMAC-SHA512 of the documented fields, in order). */
export function verifyPaymobHmac(obj: Record<string, unknown>, received: string) {
  const get = (p: string) => p.split('.').reduce<unknown>((a, k) => (a as Record<string, unknown> | undefined)?.[k], obj);
  const keys = ['amount_cents', 'created_at', 'currency', 'error_occured', 'has_parent_transaction', 'id', 'integration_id', 'is_3d_secure', 'is_auth', 'is_capture', 'is_refunded', 'is_standalone_payment', 'is_voided', 'order.id', 'owner', 'pending', 'source_data.pan', 'source_data.sub_type', 'source_data.type', 'success'];
  const concat = keys.map((k) => String(get(k) ?? '')).join('');
  const expected = createHmac('sha512', process.env.PAYMOB_HMAC_SECRET || '').update(concat).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
