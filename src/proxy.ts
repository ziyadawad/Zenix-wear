import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const PUBLIC_FILE = /\.[a-zA-Z0-9]+$/;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return new TextEncoder().encode(s);
  // Thrown inside the admin check's try block, so a missing secret in production means "not logged in".
  if (process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is not set');
  return new TextEncoder().encode('local-development-only-not-a-secret');
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Admin: first line of defence. Every page and action also checks the session itself.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    if (pathname === '/admin/login') return NextResponse.next();
    try {
      const { payload } = await jwtVerify(req.cookies.get('zenix_admin')?.value ?? '', secret(), { algorithms: ['HS256'] });
      if (payload.role !== 'admin') throw new Error('not admin');
      return NextResponse.next();
    } catch {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }
  }

  if (/^\/(ar|en)(\/|$)/.test(pathname)) return NextResponse.next();
  if (PUBLIC_FILE.test(pathname)) return NextResponse.next();

  // Arabic is the default; a visitor's saved language choice wins.
  const pref = req.cookies.get('zenix_lang')?.value === 'en' ? 'en' : 'ar';
  return NextResponse.redirect(new URL(`/${pref}${pathname === '/' ? '' : pathname}${search}`, req.url));
}

export const config = { matcher: ['/((?!api|_next|images|brand|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sitemap.xml|robots.txt).*)'] };
