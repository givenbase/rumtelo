/**
 * Household visibility
 *
 * Who may see person-attributed rows (Growth plan, Learn, Energy, Soul, personal money).
 * Source of truth for UI pickers and backend filters — the same way
 * `role-permissions.ts` is for roles.
 *
 * - A row has a maker (`accountId`) and a {@link Visibility}; no maker = together.
 * - The OWNER picks a {@link HouseholdSharingMode}, optionally per {@link VisibilityArea}.
 * - Without the `platform.sharing` capability every area behaves as SEPARATE.
 *
 * @see docs/engineering/household-visibility-plan.md
 */

import { z } from 'zod';

import {
    HouseholdAccessSource,
    HouseholdRelation,
    HouseholdRole,
    HouseholdSharingMode,
    Visibility,
    VisibilityArea,
    VisibilityChoice,
} from '../enums';

// ====================================================================
// Area catalog
// ====================================================================

export type VisibilityPortal = 'growth' | 'energy' | 'soul' | 'money';

export interface VisibilityAreaDefinition {
    portal: VisibilityPortal;
    /** Health or own-money data: stays SEPARATE unless the area itself is opened. */
    isSensitive: boolean;
    /** Rumtelo's mode for this area; null = follows the household mode. */
    mode: HouseholdSharingMode | null;
}

export const VISIBILITY_AREAS: Record<VisibilityArea, VisibilityAreaDefinition> = {
    [VisibilityArea.GROWTH_PLAN]: { portal: 'growth', isSensitive: false, mode: null },
    [VisibilityArea.GROWTH_LEARN]: { portal: 'growth', isSensitive: false, mode: null },
    [VisibilityArea.ENERGY_LOG]: {
        portal: 'energy',
        isSensitive: true,
        mode: HouseholdSharingMode.SEPARATE,
    },
    [VisibilityArea.ENERGY_TIME]: { portal: 'energy', isSensitive: false, mode: null },
    [VisibilityArea.SOUL_GRATITUDE]: { portal: 'soul', isSensitive: false, mode: null },
    [VisibilityArea.MONEY_INCOME]: { portal: 'money', isSensitive: false, mode: null },
    [VisibilityArea.MONEY_PERSONAL]: {
        portal: 'money',
        isSensitive: true,
        mode: HouseholdSharingMode.SEPARATE,
    },
};

// ====================================================================
// Settings
// ====================================================================

/** Household-level rule, stored on `HouseholdSettings.visibility`. OWNER writes. */
export const HouseholdVisibilitySettings = z.object({
    mode: z.enum(HouseholdSharingMode),
    /** Per-area override. Missing key = Rumtelo's area mode, else the household mode. */
    areas: z.partialRecord(z.enum(VisibilityArea), z.enum(HouseholdSharingMode)),
});

export type HouseholdVisibilitySettings = z.infer<typeof HouseholdVisibilitySettings>;

export const DEFAULT_VISIBILITY_SETTINGS: HouseholdVisibilitySettings = {
    mode: HouseholdSharingMode.OWNER_SEES,
    areas: {},
};

/** Fields every person-attributed DTO carries. */
export const PersonalFields = z.object({
    /** Maker (`auth.account` id); null = together. */
    accountId: z.uuid().nullable(),
    visibility: z.enum(Visibility),
    /** Viewer made this row. */
    isMine: z.boolean(),
});

export type PersonalFields = z.infer<typeof PersonalFields>;

/**
 * Mode that applies to one area, strongest first:
 * not entitled → SEPARATE; the household's choice for the area; Rumtelo's area mode;
 * the household mode.
 */
export function sharingModeFor(
    area: VisibilityArea,
    settings: HouseholdVisibilitySettings,
    isEntitled: boolean
): HouseholdSharingMode {
    if (!isEntitled) return HouseholdSharingMode.SEPARATE;
    return settings.areas[area] ?? VISIBILITY_AREAS[area].mode ?? settings.mode;
}

/** "Who paid / whose account" fields: Plus+ and more than one participant. */
export function attributionEnabled(input: {
    isEntitled: boolean;
    participantCount: number;
}): boolean {
    return input.isEntitled && input.participantCount > 1;
}

// ====================================================================
// Choices
// ====================================================================

const CHOICE_RANK: Record<VisibilityChoice, number> = {
    [VisibilityChoice.PRIVATE]: 0,
    [VisibilityChoice.OWNER]: 1,
    [VisibilityChoice.HOUSEHOLD]: 2,
    [VisibilityChoice.SHARED]: 3,
};

/** True when `choice` is at most as open as `ceiling`. */
export function isChoiceWithin(choice: VisibilityChoice, ceiling: VisibilityChoice): boolean {
    return CHOICE_RANK[choice] <= CHOICE_RANK[ceiling];
}

/** Form choice of a stored row. */
export function choiceOf(row: { accountId: string | null; visibility: Visibility }) {
    if (row.accountId === null) return VisibilityChoice.SHARED;
    return row.visibility as unknown as VisibilityChoice;
}

/** Stored fields for a form choice made by `makerAccountId`. */
export function fromChoice(
    choice: VisibilityChoice,
    makerAccountId: string
): { accountId: string | null; visibility: Visibility } {
    if (choice === VisibilityChoice.SHARED) {
        return { accountId: null, visibility: Visibility.HOUSEHOLD };
    }
    return { accountId: makerAccountId, visibility: choice as unknown as Visibility };
}

/**
 * Choices a person may pick for new or edited rows in an area.
 * VIEWERs make no personal rows. "Share with owner" is never offered to the owner.
 */
export function visibilityOptionsFor(input: {
    role: HouseholdRole;
    mode: HouseholdSharingMode;
}): VisibilityChoice[] {
    const { role, mode } = input;
    if (role === HouseholdRole.VIEWER) return [];
    if (mode === HouseholdSharingMode.SEPARATE) return [VisibilityChoice.PRIVATE];
    if (role === HouseholdRole.OWNER) {
        return [VisibilityChoice.PRIVATE, VisibilityChoice.HOUSEHOLD, VisibilityChoice.SHARED];
    }
    if (mode === HouseholdSharingMode.OWNER_SEES) {
        return [VisibilityChoice.PRIVATE, VisibilityChoice.OWNER];
    }
    return [
        VisibilityChoice.PRIVATE,
        VisibilityChoice.OWNER,
        VisibilityChoice.HOUSEHOLD,
        VisibilityChoice.SHARED,
    ];
}

/** Whether the picker is shown at all — hidden for a single participant. */
export function isVisibilityPickerShown(participantCount: number): boolean {
    return participantCount > 1;
}

/** Preselected choice: the most open personal option, or PRIVATE when the person prefers it. */
export function defaultVisibilityChoice(
    options: readonly VisibilityChoice[],
    prefersPrivate: boolean
): VisibilityChoice {
    if (prefersPrivate) return VisibilityChoice.PRIVATE;
    const personal = options.filter(option => option !== VisibilityChoice.SHARED);
    return personal.at(-1) ?? VisibilityChoice.PRIVATE;
}

// ====================================================================
// Effective visibility (stricter rule applies immediately)
// ====================================================================

/** Most open personal visibility a maker with this role may hold under the mode. */
export function visibilityCeilingFor(
    makerRole: HouseholdRole | null,
    mode: HouseholdSharingMode
): Visibility {
    if (makerRole === null) return Visibility.PRIVATE;
    const personal = visibilityOptionsFor({ role: makerRole, mode }).filter(
        option => option !== VisibilityChoice.SHARED
    );
    return (personal.at(-1) ?? VisibilityChoice.PRIVATE) as unknown as Visibility;
}

/** `min(row.visibility, ceiling)` — computed on read, never written back. */
export function effectiveVisibility(
    visibility: Visibility,
    makerRole: HouseholdRole | null,
    mode: HouseholdSharingMode
): Visibility {
    const ceiling = visibilityCeilingFor(makerRole, mode);
    const rank = (value: Visibility) => CHOICE_RANK[value as unknown as VisibilityChoice];
    return rank(visibility) <= rank(ceiling) ? visibility : ceiling;
}

// ====================================================================
// Who sees / edits
// ====================================================================

export interface VisibilityViewer {
    /** Viewer's `auth.account` id; null when they have none in this household. */
    accountId: string | null;
    role: HouseholdRole;
    relation: HouseholdRelation | null;
    source: HouseholdAccessSource;
}

export interface VisibilityScope {
    mode: HouseholdSharingMode;
    /** Maker roles in this household (participants and viewers). */
    makerRoles: ReadonlyMap<string, HouseholdRole>;
    /** Practice preview: accounts that consented for this area. */
    consentingAccountIds?: ReadonlySet<string>;
}

export interface VisibilityRow {
    accountId: string | null;
    visibility: Visibility;
}

/** OWNER / MEMBER seat that is not EXTERNAL. */
export function isParticipant(viewer: VisibilityViewer): boolean {
    return (
        viewer.source === HouseholdAccessSource.SEAT &&
        viewer.relation !== HouseholdRelation.EXTERNAL &&
        (viewer.role === HouseholdRole.OWNER || viewer.role === HouseholdRole.MEMBER)
    );
}

/**
 * Makers whose rows this viewer sees, grouped by stored visibility.
 * The backend turns this into one SQL filter; {@link canSee} is the row-by-row twin.
 */
export function visibleMakersFor(
    viewer: VisibilityViewer,
    scope: VisibilityScope
): { isOwnVisible: boolean; isSharedVisible: boolean; byVisibility: Record<Visibility, string[]> } {
    const byVisibility: Record<Visibility, string[]> = {
        [Visibility.PRIVATE]: [],
        [Visibility.OWNER]: [],
        [Visibility.HOUSEHOLD]: [],
    };
    const isPractice = viewer.source === HouseholdAccessSource.PRACTICE;
    const participant = isParticipant(viewer);

    for (const [accountId, makerRole] of scope.makerRoles) {
        if (accountId === viewer.accountId) continue;
        const ceiling = visibilityCeilingFor(makerRole, scope.mode);
        if (isPractice) {
            if (ceiling === Visibility.HOUSEHOLD && scope.consentingAccountIds?.has(accountId)) {
                byVisibility[Visibility.HOUSEHOLD].push(accountId);
            }
            continue;
        }
        if (!participant) continue;
        if (ceiling === Visibility.HOUSEHOLD) {
            byVisibility[Visibility.HOUSEHOLD].push(accountId);
        }
        // OWNER rows, and HOUSEHOLD rows clamped down to OWNER, reach only the owner.
        if (viewer.role === HouseholdRole.OWNER && ceiling !== Visibility.PRIVATE) {
            byVisibility[Visibility.OWNER].push(accountId);
            if (ceiling === Visibility.OWNER) byVisibility[Visibility.HOUSEHOLD].push(accountId);
        }
    }

    return {
        isOwnVisible: !isPractice && viewer.accountId !== null,
        isSharedVisible: true,
        byVisibility,
    };
}

/** Row-level twin of {@link visibleMakersFor}. */
export function canSee(viewer: VisibilityViewer, row: VisibilityRow, scope: VisibilityScope) {
    if (row.accountId === null) return true;
    const isPractice = viewer.source === HouseholdAccessSource.PRACTICE;
    if (!isPractice && row.accountId === viewer.accountId) return true;

    const makerRole = scope.makerRoles.get(row.accountId) ?? null;
    const effective = effectiveVisibility(row.visibility, makerRole, scope.mode);
    if (isPractice) {
        return (
            effective === Visibility.HOUSEHOLD &&
            (scope.consentingAccountIds?.has(row.accountId) ?? false)
        );
    }
    if (!isParticipant(viewer)) return false;
    if (effective === Visibility.HOUSEHOLD) return true;
    return effective === Visibility.OWNER && viewer.role === HouseholdRole.OWNER;
}

/**
 * Edit rights: personal rows by their maker only. Together rows: every participant
 * under TOGETHER, OWNER + MEMBER under OWNER_SEES (only the owner deletes),
 * read-only under SEPARATE.
 */
export function canEdit(viewer: VisibilityViewer, row: VisibilityRow, mode: HouseholdSharingMode) {
    if (!isParticipant(viewer)) return false;
    if (row.accountId !== null) return row.accountId === viewer.accountId;
    return mode !== HouseholdSharingMode.SEPARATE;
}

/** Delete rights — like {@link canEdit}, except together rows under OWNER_SEES are owner-only. */
export function canDelete(
    viewer: VisibilityViewer,
    row: VisibilityRow,
    mode: HouseholdSharingMode
) {
    if (!canEdit(viewer, row, mode)) return false;
    if (row.accountId !== null) return true;
    return mode === HouseholdSharingMode.TOGETHER || viewer.role === HouseholdRole.OWNER;
}

/** Choices allowed for a child row under a parent (never more open than the parent). */
export function childVisibilityOptions(
    options: readonly VisibilityChoice[],
    parent: VisibilityRow | null
): VisibilityChoice[] {
    if (!parent) return [...options];
    const ceiling = choiceOf(parent);
    if (ceiling === VisibilityChoice.SHARED) return [...options];
    return options.filter(option => isChoiceWithin(option, ceiling));
}
