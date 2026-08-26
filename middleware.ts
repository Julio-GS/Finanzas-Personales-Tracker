import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME, verifySessionToken } from '@/lib/auth-core';

const PUBLIC_STATIC_PATHS = [
  '/_next',
  '/favicon.ico',
  '/icon.png',
  '/robots.txt',
  '/manifest.json',
];

const PUBLIC_AUTH_API_PATHS = [
  '/api/auth/login',
  '/api/auth/logout',
];

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // 1. Framework and static assets pass through
  if (PUBLIC_STATIC_PATHS.some((prefix) => pathname.startsWith(prefix) || pathname === prefix)) {
    return NextResponse.next();
  }

  // 2. Auth API endpoints (login and logout) are public
  if (PUBLIC_AUTH_API_PATHS.includes(pathname)) {
    return NextResponse.next();
  }

  // 3. Check session cookie validity
  const sessionCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const authSecret = process.env.AUTH_SECRET ?? '';

  const verification = sessionCookie && authSecret
    ? await verifySessionToken(sessionCookie, authSecret)
    : { valid: false as const, reason: 'missing_session_or_secret' };

  const isAuthenticated = verification.valid;

  // 4. If visiting /login
  if (pathname === '/login') {
    if (isAuthenticated) {
      // Authenticated users should not see login page; redirect to dashboard
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // 5. If authenticated, allow protected pages and protected APIs
  if (isAuthenticated) {
    return NextResponse.next();
  }

  // 6. Unauthenticated handling
  // For API endpoints: return 401 JSON without redirect
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      {
        error: {
          code: 'unauthorized',
          message: 'Unauthorized',
        },
      },
      { status: 401 }
    );
  }

  // For protected page requests: redirect to /login
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
