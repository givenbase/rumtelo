/**
 * Better Auth API Route Handler — proxies to Nest.
 * Cookies bind to DOMAIN_WEB for sign-up / verify / reset flows.
 */

import { createBetterAuthRouteHandlers } from '@rumtelo/utils';

import { env } from '@/lib/get-env';

export const { DELETE, GET, PATCH, POST, PUT } = createBetterAuthRouteHandlers({
    backendUrl: env.DOMAIN_BACK,
});
