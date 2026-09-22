/**
 * Same-origin API proxy to the Nest backend.
 *
 * Browser → `{DOMAIN_APP}/api/backend/money/jars/list`
 * Proxy  → `{DOMAIN_BACK}/money/jars/list` (Nest; private on Railway)
 *
 * `/api/auth/*` stays on `api/auth/[...all]/route.ts`.
 */

import { env } from '@/app/_utils/get-env';

const backendUrl = env.DOMAIN_BACK.replace(/\/$/, '');

export async function GET(request: Request) {
    return proxy(request);
}

export async function POST(request: Request) {
    return proxy(request);
}

export async function PUT(request: Request) {
    return proxy(request);
}

export async function DELETE(request: Request) {
    return proxy(request);
}

export async function PATCH(request: Request) {
    return proxy(request);
}

async function proxy(request: Request) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/auth/')) {
        return new Response('Not Found', { status: 404 });
    }

    // /api/backend/money/jars/list → /money/jars/list
    const nestPath = url.pathname.replace(/^\/api\/backend/, '') || '/';
    const backendPath = `${backendUrl}${nestPath}${url.search}`;

    const headers = new Headers(request.headers);
    const origin = request.headers.get('origin');
    if (origin) headers.set('origin', origin);

    let response: Response;
    try {
        response = await fetch(backendPath, {
            body:
                request.method !== 'GET' && request.method !== 'HEAD'
                    ? await request.arrayBuffer()
                    : undefined,
            credentials: 'include',
            headers: Object.fromEntries(headers.entries()),
            method: request.method,
        });
    } catch (error) {
        const isConnectionRefused =
            error instanceof Error &&
            'cause' in error &&
            (error.cause as { code?: string })?.code === 'ECONNREFUSED';

        const message = isConnectionRefused
            ? `Backend unavailable at ${backendUrl}. Is Nest running?`
            : `Proxy failed: ${error instanceof Error ? error.message : String(error)}`;

        return Response.json({ error: message, status: 503 }, { status: 503 });
    }

    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('transfer-encoding');
    responseHeaders.delete('content-length');

    return new Response(responseBody, {
        headers: responseHeaders,
        status: response.status,
        statusText: response.statusText,
    });
}
