import 'server-only';
import { cookies, headers } from 'next/headers';
import { OWNER_COOKIE, verifyOwnerToken } from '../session';
import { deviceLabel } from './ledger';

/** Second line of defence behind the proxy: every dashboard API handler calls this before touching data. */
export async function ownerSession() {
  return verifyOwnerToken((await cookies()).get(OWNER_COOKIE)?.value);
}

/** "صاحب البراند · موبايل": one owner login, so the device is what tells changes apart in the log. */
export async function currentActor() {
  const device = deviceLabel((await headers()).get('user-agent'));
  return device ? `صاحب البراند · ${device}` : 'صاحب البراند';
}

/** Blocks cross-site form posts: the request must come from this same site. */
export async function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true; // Same-origin fetches from older browsers can omit it; the SameSite cookie still applies.
  const host = (await headers()).get('x-forwarded-host') ?? (await headers()).get('host');
  try { return new URL(origin).host === host; } catch { return false; }
}

export const NO_STORE = { 'Cache-Control': 'private, no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' };
export const unauthorized = () => Response.json({ error: 'unauthorized' }, { status: 401, headers: NO_STORE });
