import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

const isProdBuild = process.env.NODE_ENV === 'production' && !process.env.SKIP_ENV_VALIDATION;

const portalOrigin = (devDefault: string) => (isProdBuild ? z.url() : z.url().default(devDefault));

/**
 * Marketing site.
 *
 *   NEXT_PUBLIC_DOMAIN_APP  → product (sign-in after verify / reset)
 *   NEXT_PUBLIC_DOMAIN_WEB  → this site (sign-up, verify, forgot / reset)
 *   NEXT_PUBLIC_DOMAIN_BACK → Nest public (display only)
 *   DOMAIN_BACK             → Nest origin for `/api/auth` proxy (server-only)
 */
export const env = createEnv({
    client: {
        NEXT_PUBLIC_DOMAIN_APP: portalOrigin('http://localhost:3000'),
        NEXT_PUBLIC_DOMAIN_WEB: portalOrigin('http://localhost:3001'),
        NEXT_PUBLIC_DOMAIN_BACK: portalOrigin('http://localhost:3002'),
        /**
         * Scheduled maintenance — hide registration; login stays.
         * Website-only; backend uses `MAINTENANCE` separately.
         */
        NEXT_PUBLIC_MAINTENANCE: z.enum(['true', 'false']).optional(),
    },

    emptyStringAsUndefined: true,

    runtimeEnv: {
        DOMAIN_BACK: process.env.DOMAIN_BACK ?? process.env.NEXT_PUBLIC_DOMAIN_BACK,
        NEXT_PUBLIC_DOMAIN_APP: process.env.NEXT_PUBLIC_DOMAIN_APP,
        NEXT_PUBLIC_DOMAIN_WEB: process.env.NEXT_PUBLIC_DOMAIN_WEB,
        NEXT_PUBLIC_DOMAIN_BACK: process.env.NEXT_PUBLIC_DOMAIN_BACK,
        NEXT_PUBLIC_MAINTENANCE: process.env.NEXT_PUBLIC_MAINTENANCE,
        NODE_ENV: process.env.NODE_ENV,
        SKIP_ENV_VALIDATION: process.env.SKIP_ENV_VALIDATION,
    },

    server: {
        DOMAIN_BACK: portalOrigin('http://localhost:3002'),
        NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development').optional(),
        SKIP_ENV_VALIDATION: z.string().optional(),
    },

    skipValidation: Boolean(process.env.SKIP_ENV_VALIDATION),
});
