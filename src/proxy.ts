import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('dashboard_token')?.value;
  const validToken = process.env.DASHBOARD_SECRET;

  /*
   * A missing DASHBOARD_SECRET must never count as
   * "logged in" (undefined === undefined), otherwise
   * the dashboard and analytics APIs are open to everyone.
   */
  const isLoggedIn = Boolean(validToken) && token === validToken;
  const { pathname } = request.nextUrl;

  // Protect /dashboard — redirect to login if not authenticated
  if (pathname === '/dashboard' && !isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard/login', request.url));
  }

  // If already logged in, skip the login page
  if (pathname === '/dashboard/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Protect analytics APIs — return 401 JSON if not authenticated
  if (pathname.startsWith('/api/analytics') && !isLoggedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard', '/dashboard/login', '/api/analytics/:path*'],
};

