/**
 * When to show the staging environment banner.
 * Driven only by `NODE_ENV` — show when `staging`, otherwise hide.
 */

export function shouldShowStagingBanner(opts: { nodeEnv?: string | null }): boolean {
    const nodeEnv = opts.nodeEnv?.trim().toLowerCase() ?? 'development';
    return nodeEnv === 'staging';
}
