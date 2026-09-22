import { applyTrustedClientIpHeaders, resolveClientIpFromHeaders } from './better-auth-client-ip';
import { rewriteBetterAuthSetCookie } from './better-auth-proxy-cookies';

export type BetterAuthProxyOptions = {
    backendUrl?: string;
    logLabel?: string;
};

function resolveBackendUrl(backendUrl?: string): string {
    return (
        backendUrl ??
        process.env.DOMAIN_BACK ??
        process.env.NEXT_PUBLIC_DOMAIN_BACK ??
        'http://localhost:3002'
    );
}

/**
 * Proxy a Better Auth request from a Next.js app to the Nest backend API.
 * Preserves cookies and rewrites Set-Cookie for local dev vs production.
 *
 * Collapses Railway multi-hop forwarded IPs to a single `x-real-ip` so Nest
 * Better Auth rate limits can key per client (BA rejects multi-value XFF).
 *
 * @see https://www.better-auth.com/docs/integrations/next
 * @see https://www.better-auth.com/docs/concepts/rate-limit#connecting-ip-address
 */
export async function proxyBetterAuthRequest(
    request: Request,
    options?: BetterAuthProxyOptions
): Promise<Response> {
    const backendUrl = resolveBackendUrl(options?.backendUrl);
    const logLabel = options?.logLabel ?? 'Auth Proxy';
    const url = new URL(request.url);
    const backendPath = `${backendUrl.replace(/\/$/, '')}${url.pathname}${url.search}`;

    const requestHeaders = new Headers(request.headers);

    const origin = request.headers.get('origin');
    if (origin) {
        requestHeaders.set('origin', origin);
    }

    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        requestHeaders.set('cookie', cookieHeader);
    }

    const clientIp = resolveClientIpFromHeaders(request.headers);
    if (clientIp) {
        applyTrustedClientIpHeaders(requestHeaders, clientIp);
    }

    let response: Response;

    const forwardHeaders: Record<string, string> = {};
    requestHeaders.forEach((value, key) => {
        forwardHeaders[key] = value;
    });

    try {
        // Better Auth returns 302 for verify-email / OAuth when `callbackURL` is set.
        // Default fetch follows redirects — that drops Set-Cookie and can 500 inside Next.
        // Pass the 302 through so the browser (and cookies on rumtelo.com) handle it.
        response = await fetch(backendPath, {
            body:
                request.method !== 'GET' && request.method !== 'HEAD'
                    ? await request.arrayBuffer()
                    : undefined,
            credentials: 'include',
            headers: forwardHeaders,
            method: request.method,
            redirect: 'manual',
        });
    } catch (error) {
        const isConnectionRefused =
            error instanceof Error &&
            'cause' in error &&
            (error.cause as { code?: string })?.code === 'ECONNREFUSED';

        const message = isConnectionRefused
            ? `Backend service is unavailable. Could not connect to ${backendUrl}. Make sure the backend server is running.`
            : `Auth proxy request failed: ${error instanceof Error ? error.message : String(error)}`;

        console.error(`[${logLabel}] Proxy fetch failed:`, { message, path: url.pathname });

        return Response.json({ error: message, status: 503 }, { status: 503 });
    }

    const responseBody = await response.arrayBuffer();

    const setCookieHeaders: string[] = [];
    response.headers.forEach((value, key) => {
        if (key.toLowerCase() === 'set-cookie') {
            setCookieHeaders.push(value);
        }
    });

    // Strip encoding headers: Node.js fetch auto-decompresses gzip/brotli, so forwarding
    // Content-Encoding causes the browser to attempt a second decompression.
    const STRIP_HEADERS = new Set([
        'set-cookie',
        'content-encoding',
        'transfer-encoding',
        'content-length',
    ]);

    const responseHeaders = new Headers();

    response.headers.forEach((value, key) => {
        if (!STRIP_HEADERS.has(key.toLowerCase())) {
            responseHeaders.set(key, value);
        }
    });

    for (const cookieValue of setCookieHeaders) {
        responseHeaders.append('set-cookie', rewriteBetterAuthSetCookie(cookieValue));
    }

    if (response.status >= 400) {
        console.error(`[${logLabel}] Error response:`, {
            hasSetCookie: setCookieHeaders.length > 0,
            path: url.pathname,
            status: response.status,
        });
    }

    return new Response(responseBody, {
        headers: responseHeaders,
        status: response.status,
        statusText: response.statusText,
    });
}

/** Next.js App Router handlers for `/api/auth/[...all]`. */
export function createBetterAuthRouteHandlers(options?: BetterAuthProxyOptions) {
    const proxy = (request: Request) => proxyBetterAuthRequest(request, options);

    return {
        DELETE: proxy,
        GET: proxy,
        OPTIONS: async (request: Request) =>
            new Response(null, {
                status: 204,
                headers: {
                    'Access-Control-Allow-Credentials': 'true',
                    'Access-Control-Allow-Headers':
                        'Content-Type, Authorization, Cookie, x-household-id',
                    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
                    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
                },
            }),
        PATCH: proxy,
        POST: proxy,
        PUT: proxy,
    };
}
