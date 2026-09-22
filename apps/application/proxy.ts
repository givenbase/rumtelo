import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { getSessionCookie } from 'better-auth/cookies';

import { routing } from './i18n/routing';

/**
 * Next.js 16 Proxy: next-intl + Better Auth cookie checks.
 *
 * Per Better Auth:
 * - Uses getSessionCookie() for fast, optimistic session checks
 * - Does NOT validate the session (only checks cookie existence)
 * - Actual session validation happens server-side / via auth.api.getSession
 *
 * Cookie prefix must match backend `advanced.cookiePrefix` (`rumtelo`).
 *
 * @see https://www.better-auth.com/docs/integrations/next#auth-protection
 */

const AUTH_COOKIE_PREFIX = 'rumtelo';
const intlMiddleware = createMiddleware(routing);

function isSignInRoute(pathname: string): boolean {
    return pathname.startsWith('/sign-in');
}

/** Public redirects to DOMAIN_WEB + product sign-in. */
function isPublicAuthRoute(pathname: string): boolean {
    return (
        isSignInRoute(pathname) || pathname.startsWith('/sign-up') || pathname.startsWith('/verify')
    );
}

export async function proxy(request: NextRequest) {
    const intlResponse = intlMiddleware(request);

    if (process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true') {
        return intlResponse;
    }

    const sessionCookie = getSessionCookie(request, {
        cookiePrefix: AUTH_COOKIE_PREFIX,
    });
    const hasSession = !!sessionCookie;
    const pathname = request.nextUrl.pathname;

    const isSystemRoute = pathname.startsWith('/api/') || pathname.startsWith('/_next/');
    const isProtectedRoute = !isPublicAuthRoute(pathname) && !isSystemRoute;

    if (!hasSession && isProtectedRoute) {
        const signInUrl = new URL('/sign-in', request.url);
        if (pathname !== '/') {
            signInUrl.searchParams.set('redirectTo', pathname);
        }
        return NextResponse.redirect(signInUrl);
    }

    if (hasSession && isSignInRoute(pathname)) {
        const redirectTo = request.nextUrl.searchParams.get('redirectTo');
        const target =
            redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
                ? redirectTo
                : '/';
        return NextResponse.redirect(new URL(target, request.url));
    }

    return intlResponse;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
