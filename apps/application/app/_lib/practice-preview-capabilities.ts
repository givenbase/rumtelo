/**
 * What Practice staff may see/do while previewing a client household board.
 *
 * Default for **both** VIEW and MANAGE: hide all household-member chrome
 * (helpers, help, settings, quick-add, onboarding, mutations).
 * MANAGE may opt into extras later — never inherit member defaults by accident.
 */

import { PracticeClientAccess } from '@rumtelo/contracts';

import type { PracticePreviewSession } from './practice-preview';

export type PracticePreviewCapabilities = {
    /** True when a Practice coach preview session is active. */
    active: boolean;
    access: PracticeClientAccess | null;
    /** On-screen Coach tips, WhyCaption, jar guides. */
    showHelpers: boolean;
    /** Shell Help sheet / page tours. */
    showPageHelp: boolean;
    /** Soft WhyCaption under the header. */
    showWhyCaption: boolean;
    /** Household settings chrome + menu links. */
    showSettings: boolean;
    /** Quick-add FAB. */
    showQuickAdd: boolean;
    /** Plan checkout prompts. */
    showPlanCheckout: boolean;
    /** Create / edit flows (quick-add targets, modal creates). */
    showCreateFlows: boolean;
    /** Subnav links to The Coach + Why (household teaching). */
    showCoachNav: boolean;
    /**
     * Household writes (tx create, settings save, …).
     * Off for both access levels until MANAGE write procedures ship.
     */
    canMutate: boolean;
};

/** Normal household member — full product chrome. */
const MEMBER_DEFAULTS: PracticePreviewCapabilities = {
    active: false,
    access: null,
    showHelpers: true,
    showPageHelp: true,
    showWhyCaption: true,
    showSettings: true,
    showQuickAdd: true,
    showPlanCheckout: true,
    showCreateFlows: true,
    showCoachNav: true,
    canMutate: true,
};

/**
 * Shared Practice preview base — applied to VIEW and MANAGE alike.
 * Consumer teaching + settings + writes stay off until we deliberately enable them.
 */
const PREVIEW_BASE: Omit<PracticePreviewCapabilities, 'access'> = {
    active: true,
    showHelpers: false,
    showPageHelp: false,
    showWhyCaption: false,
    showSettings: false,
    showQuickAdd: false,
    showPlanCheckout: false,
    showCreateFlows: false,
    showCoachNav: false,
    canMutate: false,
};

function parseAccess(raw: string | undefined): PracticeClientAccess {
    if (raw === PracticeClientAccess.MANAGE) return PracticeClientAccess.MANAGE;
    return PracticeClientAccess.VIEW;
}

/**
 * Resolve chrome/action gates for an optional practice preview session.
 * Pass `null` when the user is a normal household member.
 */
export function practicePreviewCapabilities(
    session: PracticePreviewSession | null
): PracticePreviewCapabilities {
    if (!session) return MEMBER_DEFAULTS;

    const access = parseAccess(session.access);

    // Both access levels start from the same hide-everything preview base.
    switch (access) {
        case PracticeClientAccess.MANAGE:
            return {
                ...PREVIEW_BASE,
                access,
                // Future MANAGE-only opts go here (e.g. canMutate: true).
            };
        case PracticeClientAccess.VIEW:
        default:
            return {
                ...PREVIEW_BASE,
                access: PracticeClientAccess.VIEW,
            };
    }
}
