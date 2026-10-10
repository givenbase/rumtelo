/**
 * Single place for board vs onboarding redirect decisions.
 * Used only by `proxy.ts` — pages must not duplicate these gates.
 */

export type BoardHome = '/' | '/practice';

export type BoardGateState = {
    /** `null` = API unavailable; do not invent a redirect. */
    ready: boolean | null;
    home: BoardHome;
    /** Pending household invite — accept before creator onboarding. */
    invitePath?: string | null;
};

export function isOnboardingPath(path: string): boolean {
    return path === '/onboarding' || path.startsWith('/onboarding/');
}

/** Soft upgrade — VIEWER starts their own household while still a look-along elsewhere. */
export function isCreateOwnHouseholdPath(path: string): boolean {
    return path === '/onboarding/create' || path.startsWith('/onboarding/create/');
}

export function isPracticePath(path: string): boolean {
    return path === '/practice' || path.startsWith('/practice/');
}

/** Household invite accept — must work before boardReady (no creator onboarding). */
export function isInvitePath(path: string): boolean {
    return path === '/invite' || path.startsWith('/invite/');
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

function safeInvitePath(invitePath: string | null | undefined): string | null {
    if (!invitePath || !isInvitePath(invitePath)) return null;
    if (invitePath.includes('//') || invitePath.includes('..')) return null;
    return invitePath;
}

/**
 * Locale-stripped path to redirect to, or `null` to leave the request alone.
 */
export function resolveBoardRedirect(path: string, gate: BoardGateState): string | null {
    if (gate.ready === null) return null;

    const invitePath = safeInvitePath(gate.invitePath);

    // Invitee with a pending seat — never the creator questionnaire.
    if (!gate.ready && invitePath && !isInvitePath(path)) {
        return invitePath;
    }

    if (!gate.ready && !isOnboardingPath(path) && isBoardGatedPath(path)) {
        return '/onboarding';
    }

    // Ready users leave /onboarding — except VIEWER soft-upgrade (`/onboarding/create`).
    if (gate.ready && isOnboardingPath(path) && !isCreateOwnHouseholdPath(path)) {
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
