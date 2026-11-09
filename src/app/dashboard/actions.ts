'use server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { clientIp } from '@/lib/auth';
import { db } from '@/lib/db';
import { OWNER_COOKIE, ownerCookieOptions, ownerLoginConfigured, signOwnerToken } from '@/lib/session';

const MAX_TRIES = 5;
const LOCK_MINUTES = 15;

const locked = (mins: number) => ({ error: 'جرّبت كتير، استنى شوية', hint: `تقدر تجرب تاني بعد ${Math.max(1, mins)} دقيقة` });

/** Compares fixed-length digests, so neither the length nor the content leaks through timing. */
function passwordMatches(given: string) {
  const real = process.env.DASHBOARD_PASSWORD;
  if (!real) return false;
  const a = createHash('sha256').update(given, 'utf8').digest();
  const b = createHash('sha256').update(real, 'utf8').digest();
  return timingSafeEqual(a, b);
}

/** 5 wrong passwords from one connection, then a 15-minute wait. Stored in the database so it holds across servers. */
type LoginState = { error: string; hint?: string } | null;

export async function ownerLogin(prev: unknown, form: FormData): Promise<LoginState> {
  try {
    return await attemptLogin(form);
  } catch (e) {
    // redirect() after a good password works by throwing: let it through.
    if (e && typeof e === 'object' && 'digest' in e && String((e as { digest: unknown }).digest).startsWith('NEXT_REDIRECT')) throw e;
    console.error('[dashboard] login failed:', e instanceof Error ? e.message : 'unknown error');
    return { error: 'مش قادرين نوصل لقاعدة البيانات دلوقتي. جرب تاني بعد شوية.' };
  }
}

async function attemptLogin(form: FormData): Promise<LoginState> {
  if (!ownerLoginConfigured()) return { error: 'الداش بورد لسه متظبطتش: ضيف DASHBOARD_PASSWORD و DASHBOARD_SESSION_SECRET في Vercel.' };
  const key = `owner-login:${await clientIp()}`;
  const [lock] = await db.query<{ count: number; mins: number }>(`SELECT count, ceil(extract(epoch FROM reset_at - now()) / 60)::int AS mins FROM rate_limits WHERE key = $1 AND reset_at > now()`, [key]);
  if (lock && lock.count >= MAX_TRIES) return locked(lock.mins);

  const password = String(form.get('password') ?? '').slice(0, 200);
  if (!passwordMatches(password)) {
    const [r] = await db.query<{ count: number }>(
      `INSERT INTO rate_limits (key, count, reset_at) VALUES ($1, 1, now() + ($2 || ' minutes')::interval)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
         reset_at = CASE WHEN rate_limits.reset_at < now() THEN now() + ($2 || ' minutes')::interval ELSE rate_limits.reset_at END
       RETURNING count`, [key, String(LOCK_MINUTES)]);
    const left = MAX_TRIES - r.count;
    return left > 0 ? { error: 'الباسورد غلط', hint: `فاضلك ${left} ${left === 1 ? 'محاولة' : 'محاولات'}` } : locked(LOCK_MINUTES);
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
