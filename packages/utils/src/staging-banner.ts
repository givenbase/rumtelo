/**
 * When to show the staging environment banner (testers vs production).
 *
 * Hidden for local `development` / `test` and for production Railway / brand hosts.
 * Shown when Railway environment is staging, or the hostname is a staging host
 * (`dev.` / `dev-*` — same pattern as DOMAIN_WEB/APP on staging).
 */

export function shouldShowStagingBanner(opts: {
    /** `process.env.NODE_ENV` */
    nodeEnv?: string | null;
    /** Railway-injected `RAILWAY_ENVIRONMENT_NAME` (or NEXT_PUBLIC mirror). */
    railwayEnvironmentName?: string | null;
    /** Browser or request hostname (no port). */
    hostname?: string | null;
}): boolean {
    const nodeEnv = opts.nodeEnv?.trim().toLowerCase() ?? 'development';
    if (nodeEnv === 'development' || nodeEnv === 'test') return false;

    const railway = opts.railwayEnvironmentName?.trim().toLowerCase();
    if (railway === 'production' || railway === 'prod') return false;
    if (railway === 'staging' || railway === 'stage') return true;

    const hostname = opts.hostname?.trim().toLowerCase();
    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
        return false;
    }

    // Staging custom domains: dev.rumtelo.com, dev-app.rumtelo.com, …
    if (hostname.startsWith('dev.') || hostname.startsWith('dev-')) return true;

    return false;
}
