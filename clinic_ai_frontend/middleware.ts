/**
 * Next.js Middleware for Route Protection and Internationalization
 * Enforces role-based access control and locale routing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n/request';

// Create next-intl middleware for locale routing
const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'as-needed', // Only show prefix for non-default locales
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip locale middleware for API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  // Handle locale routing first
  const pathnameWithoutLocale = pathname.replace(/^\/(en|hi|fr)/, '') || '/';

  const token = request.cookies.get('auth_token')?.value;

  // Define exact public routes
  const exactPublicRoutes = ['/login', '/signup', '/'];

  // Define public route prefixes (e.g., for marketing pages and CarePrep links)
  const publicRoutePrefixes = ['/community', '/features', '/solutions', '/pricing', '/roadmap', '/demo', '/roi', '/security', '/changelog', '/guides', '/how-it-works', '/integrations', '/partners', '/careprep'];

  // Check if the current pathname is an exact public route or starts with a public prefix
  const isPublicRoute = exactPublicRoutes.includes(pathnameWithoutLocale) ||
    publicRoutePrefixes.some(prefix => pathnameWithoutLocale.startsWith(prefix));

  // For public routes, apply locale middleware
  if (isPublicRoute) {
    return intlMiddleware(request);
  }

  // Redirect to login if no token
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Decode token to check role
  let userRole = '';
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) throw new Error('Invalid token structure');
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = atob(base64);
    const payload = JSON.parse(jsonPayload);
    userRole = payload.role || '';
  } catch (e) {
    console.error('Error decoding token in middleware:', e);
    // If token is invalid, redirect to login to clear state
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  if (!userRole) {
    // If no role found, treat as unauthenticated
    const loginUrl = new URL('/login', request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('auth_token');
    return response;
  }

  const isProvider = ['doctor', 'nurse', 'admin', 'super_admin'].includes(userRole);
  const isPatient = userRole === 'patient';

  // Provider route protection
  if (pathnameWithoutLocale.startsWith('/provider') && !isProvider) {
    console.log('❌ Unauthorized access to provider route:', pathname, 'Role:', userRole);
    return NextResponse.redirect(new URL('/patient/dashboard', request.url));
  }

  // Patient route protection
  if (pathnameWithoutLocale.startsWith('/patient') && !isPatient) {
    console.log('❌ Unauthorized access to patient route:', pathname, 'Role:', userRole);
    return NextResponse.redirect(new URL('/provider/dashboard', request.url));
  }

  // Allow admin routes - role checking is done in the admin layout
  if (pathnameWithoutLocale.startsWith('/admin')) {
    return intlMiddleware(request);
  }

  // Apply locale middleware for authenticated routes
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

