import { z } from 'zod';

/**
 * Fail fast on boot rather than at the first request. A finance backend with a
 * half-configured environment is worse than one that refuses to start.
 *
 * Key names match Railway (Backend service). Local `.env` uses the same names.
 */
const boolish = (fallback: boolean) =>
    z
        .union([z.boolean(), z.enum(['true', 'false', '0', '1'])])
        .default(fallback)
        .transform(v => v === true || v === 'true' || v === '1');

const EnvSchema = z.object({
    // ── Runtime ──────────────────────────────────────────────────────────
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
    /**
     * Deploy label — staging vs production when NODE_ENV is `production` on both
     * Railway envs. Drives launch product deferral (Energy/Soul off in production).
     * Local: `pnpm env:use staging|production` sets this; seed scripts can rely on NODE_ENV.
     */
    APP_ENV: z.enum(['development', 'staging', 'production']).optional(),
    /** Local listen port. Railway injects PORT automatically. */
    PORT: z.coerce.number().default(3002),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

    // ── Domains ───────────────────────────────────────────────────────────
    /** Product app (public). */
    DOMAIN_APP: z.url(),
    /** Marketing site (public). */
    DOMAIN_WEB: z.url(),
    /**
     * Backend origin for private / service-to-service traffic.
     * Railway: `http://${{Backend.RAILWAY_PRIVATE_DOMAIN}}:${{Backend.PORT}}`
     * (http + PORT — not https; private mesh has no TLS).
     * Local: same as DOMAIN_BACK_PUBLIC (`http://localhost:3002`).
     */
    DOMAIN_BACK: z.url(),
    /**
     * Backend public origin (Better Auth baseURL, webhooks, external smoke).
     * Railway: `https://${{Backend.RAILWAY_PUBLIC_DOMAIN}}`.
     * Falls back to DOMAIN_BACK when unset (local / CI).
     */
    DOMAIN_BACK_PUBLIC: z.url().optional(),

    // ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: z.string().min(1),
    DATABASE_SSL: boolish(false),
    /**
     * Reserved — schema changes go through migrations only.
     * Must stay false; MikroORM synchronize is never enabled.
     */
    DATABASE_SYNC: boolish(false),
    /** Redis — was REDIS_URL. Prefer `redis://` / `rediss://`. */
    DATABASE_REDIS_URL: z.string().optional(),

    // ── Auth ──────────────────────────────────────────────────────────────
    BETTER_AUTH_SECRET: z.string().min(32, 'Use at least 32 chars; this signs sessions'),
    EMAIL_VERIFICATION_ENABLED: boolish(false),

    // ── Email ─────────────────────────────────────────────────────────────
    EMAIL_PROVIDER: z.enum(['resend', 'memory']).default('memory'),
    RESEND_API_KEY: z.string().optional(),
    /** When true, never call the provider — log only (even if provider is resend). */
    EMAIL_LOG_ONLY: boolish(false),
    /** From address for outbound mail (also receives contact-form submissions). */
    EMAIL_FROM: z.string().optional(),

    // ── Payments (optional — Checkout when STRIPE_SECRET_KEY is set) ──────
    STRIPE_SECRET_KEY: z.string().optional(),
    STRIPE_WEBHOOK_SIGNING_SECRET: z.string().optional(),
    /**
     * When true, allow free planKey changes via updateSettings (local/preview only).
     * When false and Stripe is unset, paid upgrades are blocked — stay on Basic.
     * Use with app NEXT_PUBLIC_PREVIEW_MODE for local design / demo (never in production).
     */
    BILLING_PREVIEW_BYPASS: boolish(false),

    /**
     * Scheduled maintenance flag — mirrored by Next `NEXT_PUBLIC_MAINTENANCE`.
     * Exposed on `/health` so monitors and the app can agree.
     */
    MAINTENANCE: boolish(false),

    // ── AI / maps (optional) ──────────────────────────────────────────────
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_MODEL: z.string().optional(),
    GOOGLE_MAPS_API: z.string().optional(),

    // ── Bank sync (optional — off by default) ─────────────────────────────
    FEATURE_BANK_SYNC: boolish(false),
    ENABLE_BANKING_APP_ID: z.string().optional(),
    ENABLE_BANKING_PRIVATE_KEY: z.string().optional(),

    // ── Local / ops extras (not required on Railway) ──────────────────────
    SENTRY_DSN: z.string().optional(),
    /** Swagger UI at /api/docs — on in development; elsewhere require true. */
    ENABLE_SWAGGER: z
        .union([z.boolean(), z.enum(['true', 'false', '0', '1'])])
        .optional()
        .transform(v => v === true || v === 'true' || v === '1'),
});

export type Env = z.infer<typeof EnvSchema> & {
    /** Resolved public backend origin (DOMAIN_BACK_PUBLIC ?? DOMAIN_BACK). */
    DOMAIN_BACK_PUBLIC: string;
    /** Resolved From address (EMAIL_FROM ?? default). */
    EMAIL_FROM: string;
};

/** Treat blank env values as unset (common in .env templates). */
function blankToUndefined(value: string | undefined): string | undefined {
    if (value === undefined) return undefined;
    return value.trim() === '' ? undefined : value;
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
    // Soft alias: REDIS_URL → DATABASE_REDIS_URL (pre-rename local envs).
    // Blank strings → undefined so zod defaults / required checks behave correctly
    // when a dashboard var or .env line is present but empty.
    const normalized: NodeJS.ProcessEnv = {
        ...source,
        NODE_ENV: blankToUndefined(source.NODE_ENV),
        APP_ENV: blankToUndefined(source.APP_ENV),
        DATABASE_URL: blankToUndefined(source.DATABASE_URL),
        DATABASE_REDIS_URL: blankToUndefined(source.DATABASE_REDIS_URL ?? source.REDIS_URL),
        EMAIL_FROM: blankToUndefined(source.EMAIL_FROM),
        RESEND_API_KEY: blankToUndefined(source.RESEND_API_KEY),
        ENABLE_SWAGGER: blankToUndefined(source.ENABLE_SWAGGER),
        SENTRY_DSN: blankToUndefined(source.SENTRY_DSN),
        STRIPE_SECRET_KEY: blankToUndefined(source.STRIPE_SECRET_KEY),
        STRIPE_WEBHOOK_SIGNING_SECRET: blankToUndefined(source.STRIPE_WEBHOOK_SIGNING_SECRET),
        OPENAI_API_KEY: blankToUndefined(source.OPENAI_API_KEY),
        OPENAI_MODEL: blankToUndefined(source.OPENAI_MODEL),
        GOOGLE_MAPS_API: blankToUndefined(source.GOOGLE_MAPS_API),
        ENABLE_BANKING_APP_ID: blankToUndefined(source.ENABLE_BANKING_APP_ID),
        ENABLE_BANKING_PRIVATE_KEY: blankToUndefined(source.ENABLE_BANKING_PRIVATE_KEY),
        DOMAIN_BACK_PUBLIC: blankToUndefined(source.DOMAIN_BACK_PUBLIC),
    };

    const parsed = EnvSchema.safeParse(normalized);
    if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `  - ${i.path.join('.')}: ${i.message}`);
        throw new Error(`Invalid environment:\n${issues.join('\n')}`);
    }

    const data = parsed.data;

    if (data.FEATURE_BANK_SYNC && !data.ENABLE_BANKING_APP_ID) {
        throw new Error('FEATURE_BANK_SYNC is on but ENABLE_BANKING_APP_ID is missing');
    }
    if (data.DATABASE_SYNC) {
        throw new Error(
            'DATABASE_SYNC must stay false — Rumtelo applies schema via migrations only'
        );
    }
    if (data.EMAIL_PROVIDER === 'resend' && !data.RESEND_API_KEY && !data.EMAIL_LOG_ONLY) {
        throw new Error('EMAIL_PROVIDER=resend requires RESEND_API_KEY (or EMAIL_LOG_ONLY=true)');
    }

    return {
        ...data,
        DOMAIN_BACK_PUBLIC: data.DOMAIN_BACK_PUBLIC ?? data.DOMAIN_BACK,
        EMAIL_FROM: data.EMAIL_FROM ?? 'Rumtelo <info@rumtelo.app>',
    };
}
