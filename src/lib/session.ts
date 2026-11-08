// Owner session token: one login for the dashboard and the admin area. Shared by the proxy and server code,
// so it must not import anything server-only. The secret never leaves the server and is never logged.
import { SignJWT, jwtVerify } from 'jose';

export const OWNER_COOKIE = 'zenix_owner';
export const OWNER_SESSION_DAYS = 7;

/** DASHBOARD_SESSION_SECRET signs the cookie. Returns null when it is missing or too short (= nobody can log in). */
function ownerSecret(): Uint8Array | null {
  const s = process.env.DASHBOARD_SESSION_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV !== 'production') return new TextEncoder().encode('local-development-only-dashboard-secret');
  return null;
}
export const ownerLoginConfigured = () =>
  !!process.env.DASHBOARD_PASSWORD && (process.env.NODE_ENV !== 'production' || (process.env.DASHBOARD_SESSION_SECRET?.length ?? 0) >= 32);

export async function signOwnerToken() {
  const key = ownerSecret();
  if (!key) throw new Error('Dashboard session secret is not configured.');
  return new SignJWT({ role: 'owner' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${OWNER_SESSION_DAYS}d`).sign(key);
}

export async function verifyOwnerToken(token: string | undefined): Promise<boolean> {
  const key = ownerSecret();
  if (!token || !key) return false;
  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] });
    return payload.role === 'owner';
  } catch {
    return false;
  }
}

export const ownerCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * OWNER_SESSION_DAYS,
};
