'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { db, newId } from '@/lib/db';
import { clientIp, currentUserId, endUserSession, hashPassword, rateLimit, signResetToken, startUserSession, verifyPassword, verifyResetToken } from '@/lib/auth';
import { emailConfigured, sendEmail } from '@/lib/services';
import { isEgPhone, normalizePhone, SITE_URL } from '@/lib/utils';

export type AuthResult = { ok: true } | { ok: false; error: 'invalid' | 'exists' | 'password' | 'phone' | 'email' | 'name' | 'rate' };

export async function register(input: { name: string; email: string; phone: string; password: string }): Promise<AuthResult> {
  if (!(await rateLimit(`register:${await clientIp()}`, 8, 3600))) return { ok: false, error: 'rate' };
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  if (name.length < 3 || name.length > 120) return { ok: false, error: 'name' };
  if (!z.string().email().safeParse(email).success) return { ok: false, error: 'email' };
  if (!isEgPhone(input.phone)) return { ok: false, error: 'phone' };
  if (input.password.length < 8 || input.password.length > 200) return { ok: false, error: 'password' };
  const phone = normalizePhone(input.phone);
  const exists = await db.query('SELECT 1 FROM customers WHERE email = $1 OR phone = $2', [email, phone]);
  if (exists.length) return { ok: false, error: 'exists' };
  const id = newId();
  await db.query('INSERT INTO customers (id,name,email,phone,password_hash) VALUES ($1,$2,$3,$4,$5)', [id, name, email, phone, await hashPassword(input.password)]);
  await startUserSession(id);
  return { ok: true };
}

export async function login(input: { identifier: string; password: string }): Promise<AuthResult> {
  const ip = await clientIp();
  const idf = input.identifier.trim().toLowerCase();
  if (!(await rateLimit(`login:${ip}`, 12, 900)) || !(await rateLimit(`login-id:${idf}`, 8, 900))) return { ok: false, error: 'rate' };
  const phone = normalizePhone(idf);
  const [c] = await db.query<{ id: string; password_hash: string }>('SELECT id, password_hash FROM customers WHERE email = $1 OR phone = $2', [idf, phone]);
  if (!c || !(await verifyPassword(input.password, c.password_hash))) return { ok: false, error: 'invalid' };
  await startUserSession(c.id);
  return { ok: true };
}

export async function logout(locale: string) {
  await endUserSession();
  redirect(`/${locale === 'en' ? 'en' : 'ar'}/account`);
}

export async function requestPasswordReset(email: string, locale: string): Promise<{ ok: boolean; off?: boolean }> {
  if (!emailConfigured()) return { ok: false, off: true };
  if (!(await rateLimit(`reset:${await clientIp()}`, 5, 3600))) return { ok: true };
  const [c] = await db.query<{ id: string; password_hash: string; email: string }>('SELECT id, password_hash, email FROM customers WHERE email = $1', [email.trim().toLowerCase()]);
  if (c) {
    const token = await signResetToken(c.id, c.password_hash);
    const url = `${SITE_URL}/${locale === 'en' ? 'en' : 'ar'}/account/reset?token=${encodeURIComponent(token)}`;
    if (locale === 'en') await sendEmail(c.email, 'ZENIX WEAR: reset your password', `<p>Use this link within one hour to choose a new password:</p><p><a href="${url}">${url}</a></p><p>If you did not ask for this, ignore this email.</p>`);
    else await sendEmail(c.email, 'ZENIX WEAR: غيّر الباسورد', `<div dir="rtl"><p>دوس على اللينك ده في خلال ساعة عشان تختار باسورد جديد:</p><p><a href="${url}">${url}</a></p><p>لو مطلبتش كده، تجاهل الإيميل ده.</p></div>`);
  }
  return { ok: true }; // Same answer either way, so this can't be used to discover who has an account.
}

export async function resetPassword(token: string, password: string): Promise<{ ok: boolean; error?: 'password' | 'invalid' }> {
  if (password.length < 8 || password.length > 200) return { ok: false, error: 'password' };
  const t = await verifyResetToken(token);
  if (!t) return { ok: false, error: 'invalid' };
  const [c] = await db.query<{ password_hash: string }>('SELECT password_hash FROM customers WHERE id = $1', [t.id]);
  if (!c || c.password_hash.slice(-16) !== t.fp) return { ok: false, error: 'invalid' };
  await db.query('UPDATE customers SET password_hash = $1 WHERE id = $2', [await hashPassword(password), t.id]);
  return { ok: true };
}

const addressSchema = z.object({
  name: z.string().trim().min(3).max(120), phone: z.string().refine(isEgPhone), governorate: z.string().min(2).max(40),
  city: z.string().trim().min(2).max(120), address: z.string().trim().min(8).max(400),
});
export async function saveAddress(input: z.infer<typeof addressSchema>): Promise<{ ok: boolean }> {
  const id = await currentUserId();
  if (!id) return { ok: false };
  const a = addressSchema.safeParse(input);
  if (!a.success) return { ok: false };
  await db.query('INSERT INTO addresses (id,customer_id,name,phone,governorate,city,address) VALUES ($1,$2,$3,$4,$5,$6,$7)', [newId(), id, a.data.name, normalizePhone(a.data.phone), a.data.governorate, a.data.city, a.data.address]);
  return { ok: true };
}
export async function deleteAddress(addressId: string): Promise<void> {
  const id = await currentUserId();
  if (id) await db.query('DELETE FROM addresses WHERE id = $1 AND customer_id = $2', [addressId, id]);
}

/** Merges the device wishlist with the account's, so saved items follow the customer between devices. */
export async function syncWishlist(localIds: string[]): Promise<string[]> {
  const id = await currentUserId();
  if (!id) return localIds;
  for (const pid of localIds.slice(0, 200)) {
    await db.query('INSERT INTO wishlist (customer_id, product_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM products WHERE id = $2) ON CONFLICT DO NOTHING', [id, String(pid).slice(0, 100)]);
  }
  return (await db.query<{ product_id: string }>('SELECT product_id FROM wishlist WHERE customer_id = $1', [id])).map((r) => r.product_id);
}
export async function setWishlistItem(productId: string, on: boolean) {
  const id = await currentUserId();
  if (!id) return;
  if (on) await db.query('INSERT INTO wishlist (customer_id, product_id) SELECT $1, $2 WHERE EXISTS (SELECT 1 FROM products WHERE id = $2) ON CONFLICT DO NOTHING', [id, productId.slice(0, 100)]);
  else await db.query('DELETE FROM wishlist WHERE customer_id = $1 AND product_id = $2', [id, productId.slice(0, 100)]);
}
