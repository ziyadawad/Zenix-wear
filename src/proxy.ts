import { NextResponse, type NextRequest } from 'next/server';
import { OWNER_COOKIE, verifyOwnerToken } from '@/lib/session';

const PUBLIC_FILE = /\.[a-zA-Z0-9]+$/;
const NOINDEX = { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'private, no-store' };

/** Owner-only areas: every page and API route behind one session check. Pages and handlers check again themselves. */
function ownerArea(pathname: string) {
  return /^\/(dashboard|admin)(\/|$)/.test(pathname) || /^\/api\/(dashboard|admin)(\/|$)/.test(pathname);
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (ownerArea(pathname)) {
    if (pathname === '/dashboard/login' || pathname === '/admin/login') {
      const res = NextResponse.next();
      Object.entries(NOINDEX).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    if (await verifyOwnerToken(req.cookies.get(OWNER_COOKIE)?.value)) {
      const res = NextResponse.next();
      Object.entries(NOINDEX).forEach(([k, v]) => res.headers.set(k, v));
      return res;
    }
    // APIs answer 401 with no data; pages go to the login screen and come back after.
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: NOINDEX });
    const login = new URL('/dashboard/login', req.url);
    if (pathname !== '/dashboard') login.searchParams.set('next', pathname);
    return NextResponse.redirect(login);
  }

  if (/^\/(ar|en)(\/|$)/.test(pathname)) return NextResponse.next();
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  // Arabic is the default; a visitor's saved language choice wins.
  const pref = req.cookies.get('zenix_lang')?.value === 'en' ? 'en' : 'ar';
  return NextResponse.redirect(new URL(`/${pref}${pathname === '/' ? '' : pathname}${search}`, req.url));
}

export const config = {
  matcher: [
    '/((?!api|_next|images|brand|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sitemap.xml|robots.txt).*)',
    '/api/dashboard/:path*',
    '/api/admin/:path*',
  ],
};
