// Admin Middleware - SkillPlay
import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get('admin-token')?.value;
  if (token !== process.env.ADMIN_SECRET) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? 'unknown';

  console.log([ADMIN]   | ip= | t=);

  const res = NextResponse.next();
  res.headers.set('x-admin-ip', ip);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

