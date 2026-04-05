import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const COOKIE_NAME = 'lifelog_auth';

// Paths that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/auth', '/api/upload'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static assets
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Check auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  if (authCookie?.value) {
    return NextResponse.next();
  }

  // Redirect to login
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
