import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { getSessionCookie } from 'better-auth/cookies';

import {
    type BoardGateState,
    isBoardGatedPath,
    isPracticePath,
    resolveBoardRedirect,
} from './app/_lib/onboarding-gate';
import { routing } from './i18n/routing';

/**
 * Next.js 16 Proxy: next-intl + Better Auth + board-ready gate.
 *
 * Session existence uses `getSessionCookie` (optimistic, fast) for public/sign-in
 * redirects — Better Auth docs recommend that to avoid blocking every request.
 *
 * Onboarding / board redirects are decided only here via `resolveBoardRedirect`
 * + Nest `account.boardReady` (durable DB state, not a client cookie).
 *
 * Gate fetch goes **directly to Nest** (`DOMAIN_BACK`) — never same-origin
 * `/api/backend` from middleware (that can stall). No `@rumtelo/contracts` import.
 *
 * @see https://www.better-auth.com/docs/integrations/next#auth-protection
 */

const AUTH_COOKIE_PREFIX = 'rumtelo';
const intlMiddleware = createMiddleware(routing);
const BOARD_READY_TIMEOUT_MS = 4_000;

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

/** Nest origin for server-side gate calls — mirrors `env.DOMAIN_BACK` without importing contracts. */
function nestOrigin(): string {
    const raw =
        process.env.DOMAIN_BACK || process.env.NEXT_PUBLIC_DOMAIN_BACK || 'http://localhost:3002';
    return raw.replace(/\/$/, '');
}

/**
 * Durable board gate — Nest `account.boardReady` directly (OpenAPI POST).
 */
async function fetchBoardGate(request: NextRequest): Promise<BoardGateState> {
    const cookie = request.headers.get('cookie') ?? '';
    if (!cookie) return { ready: null, home: '/' };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), BOARD_READY_TIMEOUT_MS);

    try {
        const response = await fetch(`${nestOrigin()}/account/boardReady`, {
            method: 'POST',
            headers: {
                cookie,
                'content-type': 'application/json',
                accept: 'application/json',
            },
            body: '{}',
            cache: 'no-store',
            signal: controller.signal,
        });
        if (!response.ok) return { ready: null, home: '/' };
        const result = (await response.json()) as { ready?: unknown; home?: unknown };
        if (typeof result.ready !== 'boolean') return { ready: null, home: '/' };
        const home = result.home === '/practice' ? '/practice' : '/';
        return { ready: result.ready, home };
    } catch {
        return { ready: null, home: '/' };
    } finally {
        clearTimeout(timer);
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
        const gate = await fetchBoardGate(request);
        const fallback = gate.ready === false ? '/onboarding' : gate.home;
        const redirectTo = request.nextUrl.searchParams.get('redirectTo');
        const target =
            redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')
                ? redirectTo
                : withLocale(fallback, pathname);
        return NextResponse.redirect(new URL(target, request.url));
    }

    // Board / onboarding / practice-home gate — single decision via util.
    if (
        hasSession &&
        !isPracticePath(path) &&
        !isPublicAuthRoute(path) &&
        !isSystemRoute &&
        isBoardGatedPath(path)
    ) {
        const gate = await fetchBoardGate(request);
        const target = resolveBoardRedirect(path, gate);
        if (target) {
            return NextResponse.redirect(new URL(withLocale(target, pathname), request.url));
        }
    }

    return intlResponse;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
