import { createORPCClient } from '@orpc/client';
import type { ContractRouterClient } from '@orpc/contract';
import type { JsonifiedClient } from '@orpc/openapi-client';
import { OpenAPILink } from '@orpc/openapi-client/fetch';

import { contract } from '../routers';

/**
 * Nest `@Implement` speaks OpenAPI (flat JSON body). Use OpenAPILink — not
 * RPCLink — so the browser sends `{ householdName: … }` instead of `{ json: {…} }`.
 *
 * @see https://orpc.dev/docs/openapi/client/openapi-link
 */
export type AppClient = JsonifiedClient<ContractRouterClient<typeof contract>>;

function fetchInputToString(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input.url;
}

export interface CreateClientOptions {
    /**
     * API origin for OpenAPILink.
     * Prefer same-origin Next proxy (`https://app…/api/backend`) so cookies stay first-party.
     */
    url: string;
    /** Called per request — household id, SSR cookies, etc. */
    headers?:
        | Record<string, string>
        | (() => Record<string, string> | Promise<Record<string, string>>);
    fetch?: typeof globalThis.fetch;
    /** Log non-OK responses in development. */
    logErrors?: boolean;
}

export function createClient(options: CreateClientOptions): AppClient {
    let headersFn: (() => Promise<Record<string, string>>) | undefined;
    if (options.headers) {
        if (typeof options.headers === 'function') {
            const fn = options.headers;
            headersFn = async () => (await fn()) || {};
        } else {
            const staticHeaders = options.headers;
            headersFn = async () => staticHeaders;
        }
    }

    const wrappedFetch: typeof fetch = async (input, init) => {
        const response = await (options.fetch ?? globalThis.fetch)(input, {
            ...init,
            credentials: 'include',
        });

        if (options.logErrors && !response.ok && response.status !== 404) {
            try {
                const errorData = (await response.clone().json()) as {
                    code?: unknown;
                    message?: unknown;
                };
                console.error('ORPC request failed', {
                    url: fetchInputToString(input),
                    status: response.status,
                    code: errorData.code,
                    message: errorData.message,
                });
            } catch {
                console.error('ORPC request failed', fetchInputToString(input), response.status);
            }
        }

        return response;
    };

    const link = new OpenAPILink(contract, {
        url: options.url,
        headers: headersFn,
        fetch: wrappedFetch,
    });

    return createORPCClient(link);
}
