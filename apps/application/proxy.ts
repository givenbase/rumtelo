import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { getSessionCookie } from 'better-auth/cookies';

import { createClient } from '@rumtelo/contracts';

import { routing } from './i18n/routing';

/**
 * Next.js 16 Proxy: next-intl + Better Auth + board-ready gate.
 *
 * Session existence uses `getSessionCookie` (optimistic, fast) for public/sign-in
 * redirects — Better Auth docs recommend that to avoid blocking every request.
 *
 * Onboarding gate uses a real API check: `account.boardReady` via same-origin
 * oRPC (`/api/backend`), with the request cookies forwarded. That reads durable
 * `onboardedAt` + jar-bank answers (and practice membership) on Nest — not a
 * client cookie.
 *
 * @see https://www.better-auth.com/docs/integrations/next#auth-protection
 */

const AUTH_COOKIE_PREFIX = 'rumtelo';
const intlMiddleware = createMiddleware(routing);

const LOCALE_PREFIX = /^\/(en|nl|es|fr)(?=\/|$)/;

function stripLocale(pathname: string): string {
    const stripped = pathname.replace(LOCALE_PREFIX, '');
    return stripped.length > 0 ? stripped : '/';
}

function withLocale(path: string, pathname: string): string {
    const match = pathname.match(LOCALE_PREFIX);
    if (!match) return path;
    if (path === '/') return match[0] || '/';
    return `${match[0]}${path}`;
}

function isSignInRoute(path: string): boolean {
    return path.startsWith('/sign-in');
}

function isPublicAuthRoute(path: string): boolean {
    return isSignInRoute(path) || path.startsWith('/sign-up') || path.startsWith('/verify');
}

function isOnboardingRoute(path: string): boolean {
    return path === '/onboarding' || path.startsWith('/onboarding/');
}

function isPracticeRoute(path: string): boolean {
    return path === '/practice' || path.startsWith('/practice/');
}

/** Durable board gate — Nest `account.boardReady` with request cookies. */
async function fetchBoardReady(request: NextRequest): Promise<boolean | null> {
    const cookie = request.headers.get('cookie') ?? '';
    if (!cookie) return null;

    try {
        const api = createClient({
            url: new URL('/api/backend', request.url).toString().replace(/\/$/, ''),
            headers: { cookie },
            logErrors: false,
        });
        const result = await api.account.boardReady();
        return result.ready;
    } catch {
        // Backend down / unauthorized — do not invent "ready".
        return null;
    }
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
    const path = stripLocale(pathname);

    const isSystemRoute = pathname.startsWith('/api/') || pathname.startsWith('/_next/');
    const isProtectedRoute = !isPublicAuthRoute(path) && !isSystemRoute;

    if (!hasSession && isProtectedRoute) {
        const signInUrl = new URL(withLocale('/sign-in', pathname), request.url);
        if (path !== '/') {
            signInUrl.searchParams.set('redirectTo', pathname);
        }
        return NextResponse.redirect(signInUrl);
    }

    if (hasSession && isSignInRoute(path)) {
        const ready = await fetchBoardReady(request);
        const fallback = ready === false ? '/onboarding' : '/';
        const redirectTo = request.nextUrl.searchParams.get('redirectTo');
        const target =
            redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
                ? redirectTo
                : withLocale(fallback, pathname);
        return NextResponse.redirect(new URL(target, request.url));
    }

    // Board gate — only when we care about product vs onboarding (skip practice).
    if (
        hasSession &&
        !isPracticeRoute(path) &&
        !isPublicAuthRoute(path) &&
        !isSystemRoute &&
        (isOnboardingRoute(path) ||
            path === '/' ||
            path.startsWith('/product') ||
            path.startsWith('/settings'))
    ) {
        const ready = await fetchBoardReady(request);
        if (ready === false && !isOnboardingRoute(path)) {
            return NextResponse.redirect(new URL(withLocale('/onboarding', pathname), request.url));
        }
        if (ready === true && isOnboardingRoute(path)) {
            return NextResponse.redirect(new URL(withLocale('/', pathname), request.url));
        }
        // ready === null → leave alone (page can still soft-handle)
    }

    return intlResponse;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
