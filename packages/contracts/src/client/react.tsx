/**
 * React helpers for oRPC.
 *
 * Apps own a module-level `createClient` singleton (`app/_lib/api.ts`) and
 * `createAPIUtils(client)`. This package only provides the utils factory.
 *
 * Do **not** export `type APIUtils = ReturnType<typeof createAPIUtils>` from
 * this package: oRPC’s utils type exceeds TS portable naming (TS7056) and a
 * broken/stale dist `.d.ts` makes query data collapse to `never` / `{}` in
 * the app. Infer at the call site instead (see apps/application `_lib/api-hooks.ts`).
 *
 * @see https://orpc.dev/docs/advanced/exceeds-the-maximum-length-problem
 */

'use client';

import { createTanstackQueryUtils } from '@orpc/tanstack-query';

import type { AppClient } from './index';

/**
 * TanStack Query option factories for a client (`queryOptions` / `mutationOptions`).
 * Call once per app with the shared client singleton.
 *
 * TypeScript can't serialize the complex return type into a portable `.d.ts`
 * (TS7056) — that is expected; inference still works when consumers resolve
 * this module from **source** (package.json `types` → `src/…`).
 */
export function createAPIUtils(client: AppClient) {
    return createTanstackQueryUtils(client);
}
