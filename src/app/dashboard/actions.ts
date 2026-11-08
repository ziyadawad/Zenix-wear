'use server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientIp } from '@/lib/auth';
import { db } from '@/lib/db';
import { OWNER_COOKIE, ownerCookieOptions, ownerLoginConfigured, signOwnerToken } from '@/lib/session';

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

/** Compares fixed-length digests, so neither the length nor the content leaks through timing. */
function passwordMatches(given: string) {
  const real = process.env.DASHBOARD_PASSWORD;
  if (!real) return false;
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(real, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/** 5 wrong passwords from one connection, then a 15-minute wait. Stored in the database so it holds across servers. */
export async function ownerLogin(_: unknown, form: FormData): Promise<{ error: string } | null> {
  if (!ownerLoginConfigured()) return { error: 'الداش بورد لسه متظبطش: ضيف DASHBOARD_PASSWORD و DASHBOARD_SESSION_SECRET في Vercel.' };
  const key = `owner-login:${await clientIp()}`;
  const [lock] = await db.query<{ count: number; mins: number }>(`SELECT count, ceil(extract(epoch FROM reset_at - now()) / 60)::int AS mins FROM rate_limits WHERE key = $1 AND reset_at > now()`, [key]);
  if (lock && lock.count >= MAX_TRIES) return { error: `جربت كتير. استنى ${lock.mins} دقيقة وجرب تاني.` };

  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!passwordMatches(password)) {
    const [r] = await db.query<{ count: number }>(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, now() + ($2 || ' minutes')::interval)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + ($2 || ' minutes')::interval ELSE rate_limits.reset_at END
       RETURNING count`, [key, String(LOCK_MINUTES)]);
    const left = MAX_TRIES - r.count;
    return { error: left > 0 ? `الباسورد غلط. فاضلك ${left} ${left === 1 ? 'محاولة' : 'محاولات'}.` : `جربت كتير. استنى ${LOCK_MINUTES} دقيقة وجرب تاني.` };
  }
  await db.query('DELETE FROM rate_limits WHERE key = $1', [key]);
  (await cookies()).set(OWNER_COOKIE, await signOwnerToken(), ownerCookieOptions);
  const next = String(form.get('next') ?? '');
  redirect(next.startsWith('/admin') || next.startsWith('/dashboard') ? next : '/dashboard');
}

export async function ownerLogout() {
  (await cookies()).delete(OWNER_COOKIE);
  redirect('/dashboard/login');
}
