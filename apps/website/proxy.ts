import { type NextRequest } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

/**
 * Website proxy: next-intl locale detection.
 * Marketing pages are public — no Better Auth gate here.
 */
const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
    return intlMiddleware(request);
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
