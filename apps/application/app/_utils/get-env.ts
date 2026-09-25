import { createEnv } from '@t3-oss/env-nextjs';
import { PlanKey } from '@rumtelo/contracts';
import { z } from 'zod';

const isProdBuild = process.env.NODE_ENV === 'production' && !process.env.SKIP_ENV_VALIDATION;

const portalOrigin = (devDefault: string) => (isProdBuild ? z.url() : z.url().default(devDefault));

/**
 * Domain split (Railway-aware):
 *
 *   NEXT_PUBLIC_DOMAIN_APP  → product (browser / user-facing)
 *   NEXT_PUBLIC_DOMAIN_WEB  → marketing (browser)
 *   NEXT_PUBLIC_DOMAIN_BACK → Nest **public** origin (rare client links; never for proxies)
 *   DOMAIN_BACK             → Nest origin for **server-side** proxies only
 *                             Railway: `http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}`
 *                             Local: same as public (`http://localhost:3002`)
 *
 * Browsers talk to DOMAIN_APP (`/api/backend`, `/api/auth`). The Next server then
 * forwards privately to DOMAIN_BACK — browsers never see `.railway.internal`.
 */
export const env = createEnv({
    client: {
        NEXT_PUBLIC_DOMAIN_APP: portalOrigin('http://localhost:3000'),
        NEXT_PUBLIC_DOMAIN_WEB: portalOrigin('http://localhost:3001'),
        /** Public Nest origin — optional display / docs; proxies must use DOMAIN_BACK. */
        NEXT_PUBLIC_DOMAIN_BACK: portalOrigin('http://localhost:3002'),

        NEXT_PUBLIC_PREVIEW_MODE: z.enum(['true', 'false']).optional(),
        NEXT_PUBLIC_PREVIEW_PLAN: z.union([z.enum(PlanKey), z.enum(['ALL', 'FULL'])]).optional(),
        /**
         * Scheduled maintenance — product locked to `@rumtelo.com` emails.
         * Application-only; backend uses `MAINTENANCE` separately (see `/health`).
         */
        NEXT_PUBLIC_MAINTENANCE: z.enum(['true', 'false']).optional(),

        NEXT_PUBLIC_SENTRY_DSN: z.url().optional(),

        /** bol.com partner site id — Learn book links carry it when set. */
        NEXT_PUBLIC_BOL_PARTNER_ID: z.string().min(1).optional(),
        /** Amazon Associates tag (amazon.nl) — Learn book links carry it when set. */
        NEXT_PUBLIC_AMAZON_TAG: z.string().min(1).optional(),
    },

    emptyStringAsUndefined: true,

    runtimeEnv: {
        DOMAIN_BACK: process.env.DOMAIN_BACK ?? process.env.NEXT_PUBLIC_DOMAIN_BACK,

        NEXT_PUBLIC_DOMAIN_APP: process.env.NEXT_PUBLIC_DOMAIN_APP,
        NEXT_PUBLIC_DOMAIN_WEB: process.env.NEXT_PUBLIC_DOMAIN_WEB,
        NEXT_PUBLIC_DOMAIN_BACK: process.env.NEXT_PUBLIC_DOMAIN_BACK,

        NEXT_PUBLIC_PREVIEW_MODE: process.env.NEXT_PUBLIC_PREVIEW_MODE,
        NEXT_PUBLIC_PREVIEW_PLAN: process.env.NEXT_PUBLIC_PREVIEW_PLAN,
        NEXT_PUBLIC_MAINTENANCE: process.env.NEXT_PUBLIC_MAINTENANCE,
        NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
        NEXT_PUBLIC_BOL_PARTNER_ID: process.env.NEXT_PUBLIC_BOL_PARTNER_ID,
        NEXT_PUBLIC_AMAZON_TAG: process.env.NEXT_PUBLIC_AMAZON_TAG,

        NODE_ENV: process.env.NODE_ENV,
        SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
        PORT: process.env.PORT,
    },

    server: {
        /**
         * Nest origin for `/api/backend` + `/api/auth` proxies (server-only).
         * Falls back to NEXT_PUBLIC_DOMAIN_BACK when unset (local convenience).
         */
        DOMAIN_BACK: portalOrigin('http://localhost:3002'),

        NODE_ENV: z
            .enum(['development', 'test', 'staging', 'production'])
            .default('development')
            .optional(),
        SKIP_ENV_VALIDATION: z.string().optional(),
        PORT: z.coerce.number().default(3000).optional(),
    },

    skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
