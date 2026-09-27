/**
 * Client-only active household for oRPC headers (`x-household-id`).
 * Value is a Better Auth opaque AuthId — not a Rumtelo uuid.
 *
 * Priority:
 * 1. Full Practice board preview (`sessionStorage` / practice-preview)
 *    — only off `/practice/*` (never send client scope on Practice control plane)
 * 2. Better Auth active household
 *
 * Portal metrics on Practice client detail use `practice.clientPortalSnapshot`
 * (server-side ACTIVE contract) — no client query-scope header override.
 *
 * Authz remains server-side: PracticeMember + ACTIVE PracticeClientLink.
 * Clearing preview on exit is mandatory so headers cannot retain client scope.
 */

import { getActivePracticePreviewForHeaders } from '@/app/_lib/practice-preview';

let activeHouseholdId: string | null = null;

export function setClientHouseholdId(id: string | null): void {
    activeHouseholdId = id;
}

export function getClientHouseholdHeaders(): Record<string, string> {
    const preview = getActivePracticePreviewForHeaders();
    if (preview) {
        return {
            'x-household-id': preview.householdId,
            'x-practice-id': preview.practiceId,
        };
    }
    return activeHouseholdId ? { 'x-household-id': activeHouseholdId } : {};
}
