/**
 * Better Auth API Route Handler — proxies to the Nest backend via @rumtelo/utils.
 *
 * Same-origin `/api/auth` so session cookies bind to DOMAIN_APP.
 * Server forwards to DOMAIN_BACK (private on Railway).
 *
 * @see https://www.better-auth.com/docs/integrations/next
 */

import { createBetterAuthRouteHandlers } from '@rumtelo/utils';

import { env } from '@/app/_utils/get-env';

export const { DELETE, GET, PATCH, POST, PUT } = createBetterAuthRouteHandlers({
    backendUrl: env.DOMAIN_BACK,
});
