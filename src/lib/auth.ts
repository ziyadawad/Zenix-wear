import 'server-only';
import { randomBytes, scrypt as scryptCb, timingSafeEqual, createHmac } from 'node:crypto';
import { promisify } from 'node:util';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify } from 'jose';
import { db } from './db';
import { OWNER_COOKIE, verifyOwnerToken } from './session';

const scrypt = promisify(scryptCb) as (p: string, s: Buffer, l: number) => Promise<Buffer>;

export const USER_COOKIE = 'zenix_session';

function secretString() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET must be set to at least 32 characters.');
  return 'local-development-only-not-a-secret';
}
const secret = () => new TextEncoder().encode(secretString());

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`; // No $ signs: .env files would expand them
}
export async function verifyPassword(password: string, stored: string) {
  const [alg, saltHex, hashHex] = stored.split(':');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const got = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, got);
}

async function sign(payload: Record<string, unknown>, exp: string) {
  return new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(exp).sign(secret());
}
async function verify(token: string | undefined) {
  if (!token) return null;
  try {
    return (await jwtVerify(token, secret(), { algorithms: ['HS256'] })).payload;
  } catch {
    return null;
  }
}

const cookieOpts = (maxAge: number) => ({
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' && !!process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https'), path: '/', maxAge,
});

// ---- Owner (dashboard + admin) -----------------------------------------------------------------
// One login for both: the password is DASHBOARD_PASSWORD and the cookie is signed with DASHBOARD_SESSION_SECRET.
// Logging in and out lives in src/app/dashboard/actions.ts.
export async function isAdmin() {
  return verifyOwnerToken((await cookies()).get(OWNER_COOKIE)?.value);
}
/** Call at the top of every admin/dashboard page and every admin server action. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/dashboard/login');
}

// ---- Customers --------------------------------------------------------------------------------
export async function startUserSession(id: string) {
  const token = await sign({ sub: id, role: 'customer' }, '30d');
  (await cookies()).set(USER_COOKIE, token, cookieOpts(60 * 60 * 24 * 30));
}
export async function endUserSession() {
  (await cookies()).delete(USER_COOKIE);
}
export async function currentUserId() {
  const p = await verify((await cookies()).get(USER_COOKIE)?.value);
  return p?.role === 'customer' && typeof p.sub === 'string' ? p.sub : null;
}
export async function currentUser() {
  const id = await currentUserId();
  if (!id) return null;
  const rows = await db.query<{ id: string; name: string; email: string; phone: string }>('SELECT id,name,email,phone FROM customers WHERE id = $1', [id]);
  return rows[0] ?? null;
}

/** Single-use by construction: the token is bound to the current password hash. */
export async function signResetToken(id: string, passwordHash: string) {
  return sign({ sub: id, purpose: 'reset', fp: passwordHash.slice(-16) }, '1h');
}
export async function verifyResetToken(token: string) {
  const p = await verify(token);
  return p?.purpose === 'reset' && typeof p.sub === 'string' ? { id: p.sub, fp: p.fp as string } : null;
}

// ---- Order links ------------------------------------------------------------------------------
/** Lets the guest who placed an order open its confirmation page, without exposing order numbers to guessing. */
export function orderToken(number: string) {
  return createHmac('sha256', secretString()).update(`order:${number}`).digest('base64url').slice(0, 24);
}
export function checkOrderToken(number: string, token: string | undefined) {
  if (!token) return false;
  const a = Buffer.from(orderToken(number));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ---- Rate limiting ----------------------------------------------------------------------------
export async function clientIp() {
  const h = await headers();
  return h.get('x-real-ip') || h.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
}
/** Fixed-window limiter in the database, so it holds across serverless instances. True when allowed. */
export async function rateLimit(key: string, max: number, windowSec: number) {
  const rows = await db.query<{ count: number }>(
    `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, now() + ($2 || ' seconds')::interval)
     ON CONFLICT (key) DO UPDATE SET
       count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
       reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + ($2 || ' seconds')::interval ELSE rate_limits.reset_at END
     RETURNING count`,
    [key, String(windowSec)],
  );
  // Occasional housekeeping, so the table doesn't grow forever.
  if (Math.random() < 0.01) await db.query('DELETE FROM rate_limits WHERE reset_at < now()');
  return rows[0].count <= max;
}
