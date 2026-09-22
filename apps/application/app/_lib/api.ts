/**
 * Application oRPC client.
 *
 * Same-origin base URL so the browser sends Better Auth cookies; Next
 * `/api/backend/[...path]` proxies to Nest and forwards Cookie / Origin.
 *
 */

import { createClient, type AppClient } from '@rumtelo/contracts';

import { getClientHouseholdHeaders } from '@/app/_lib/household-api-context';
import { env } from '@/app/_utils/get-env';

/** Browser: app origin. SSR: configured app domain. */
function getApiBaseURL(): string {
    const origin =
        typeof window !== 'undefined' ? window.location.origin : env.NEXT_PUBLIC_DOMAIN_APP;
    return `${origin.replace(/\/$/, '')}/api/backend`;
}

export const api: AppClient = createClient({
    url: getApiBaseURL(),
    headers: getClientHouseholdHeaders,
    logErrors: process.env.NODE_ENV === 'development',
});
