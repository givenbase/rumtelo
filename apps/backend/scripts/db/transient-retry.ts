/**
 * Retry helpers for Railway TCP-proxy blips (ECONNRESET on cold connect).
 * Used by migration-up / seeder-run — not Nest runtime.
 */

const TRANSIENT =
    /ECONNRESET|ECONNREFUSED|ETIMEDOUT|EPIPE|Connection terminated|server closed the connection|connect ECONNRESET/i;

export function isTransientDbError(error: unknown): boolean {
    if (!(error instanceof Error)) return false;
    if (TRANSIENT.test(error.message)) return true;
    const cause = (error as Error & { cause?: unknown }).cause;
    return cause instanceof Error ? TRANSIENT.test(cause.message) : false;
}

export async function withTransientRetry<T>(
    label: string,
    fn: () => Promise<T>,
    attempts = 4
): Promise<T> {
    let last: unknown;
    for (let i = 1; i <= attempts; i++) {
        try {
            return await fn();
        } catch (error: unknown) {
            last = error;
            if (i === attempts || !isTransientDbError(error)) throw error;
            const waitMs = Math.min(1000 * 2 ** (i - 1), 8000);
            const msg = error instanceof Error ? error.message : String(error);
            console.warn(`[${label}] ${msg} — retry ${i}/${attempts - 1} in ${waitMs}ms`);
            await new Promise(resolve => setTimeout(resolve, waitMs));
        }
    }
    throw last;
}
