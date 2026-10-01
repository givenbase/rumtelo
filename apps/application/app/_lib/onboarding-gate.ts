/**
 * Single place for board vs onboarding redirect decisions.
 * Used only by `proxy.ts` — pages must not duplicate these gates.
 */

export type BoardHome = '/' | '/practice';

export type BoardGateState = {
    /** `null` = API unavailable; do not invent a redirect. */
    ready: boolean | null;
    home: BoardHome;
};

export function isOnboardingPath(path: string): boolean {
    return path === '/onboarding' || path.startsWith('/onboarding/');
}

export function isPracticePath(path: string): boolean {
    return path === '/practice' || path.startsWith('/practice/');
}

/** Routes that must not be used until the board is ready. */
export function isBoardGatedPath(path: string): boolean {
    return (
        isOnboardingPath(path) ||
        path === '/' ||
        path.startsWith('/product') ||
        path.startsWith('/settings')
    );
}

/**
 * Locale-stripped path to redirect to, or `null` to leave the request alone.
 */
export function resolveBoardRedirect(
    path: string,
    gate: BoardGateState
): '/onboarding' | BoardHome | null {
    if (gate.ready === null) return null;

    if (!gate.ready && !isOnboardingPath(path) && isBoardGatedPath(path)) {
        return '/onboarding';
    }

    if (gate.ready && isOnboardingPath(path)) {
        return gate.home;
    }

    // Practice-only staff on the household board → practice desk.
    if (
        gate.ready &&
        gate.home === '/practice' &&
        !isPracticePath(path) &&
        isBoardGatedPath(path)
    ) {
        return '/practice';
    }

    return null;
}
