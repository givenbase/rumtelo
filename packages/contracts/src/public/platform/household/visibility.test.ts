import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    HouseholdAccessSource,
    HouseholdRelation,
    HouseholdRole,
    HouseholdSharingMode,
    Visibility,
    VisibilityArea,
    VisibilityChoice,
} from '../enums';
import {
    DEFAULT_VISIBILITY_SETTINGS,
    attributionEnabled,
    canDelete,
    canEdit,
    canSee,
    childVisibilityOptions,
    defaultVisibilityChoice,
    effectiveVisibility,
    sharingModeFor,
    visibilityOptionsFor,
    visibleMakersFor,
    type VisibilityRow,
    type VisibilityScope,
    type VisibilityViewer,
} from './visibility';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const MEMBER_ID = '00000000-0000-4000-8000-000000000002';
const VIEWER_ID = '00000000-0000-4000-8000-000000000003';
const HELPER_ID = '00000000-0000-4000-8000-000000000004';
const COACH_ID = '00000000-0000-4000-8000-000000000005';

const makerRoles = new Map<string, HouseholdRole>([
    [OWNER_ID, HouseholdRole.OWNER],
    [MEMBER_ID, HouseholdRole.MEMBER],
    [VIEWER_ID, HouseholdRole.VIEWER],
    [HELPER_ID, HouseholdRole.MEMBER],
]);

const seat = (
    accountId: string,
    role: HouseholdRole,
    relation = HouseholdRelation.FAMILY
): VisibilityViewer => ({ accountId, role, relation, source: HouseholdAccessSource.SEAT });

const viewers: VisibilityViewer[] = [
    seat(OWNER_ID, HouseholdRole.OWNER),
    seat(MEMBER_ID, HouseholdRole.MEMBER),
    seat(VIEWER_ID, HouseholdRole.VIEWER),
    seat(HELPER_ID, HouseholdRole.MEMBER, HouseholdRelation.EXTERNAL),
    {
        accountId: COACH_ID,
        role: HouseholdRole.VIEWER,
        relation: null,
        source: HouseholdAccessSource.PRACTICE,
    },
];

const rows: VisibilityRow[] = [
    { accountId: null, visibility: Visibility.HOUSEHOLD },
    ...[OWNER_ID, MEMBER_ID, VIEWER_ID, HELPER_ID].flatMap(accountId =>
        Object.values(Visibility).map(visibility => ({ accountId, visibility }))
    ),
];

const modes = Object.values(HouseholdSharingMode);

describe('sharingModeFor', () => {
    it('forces SEPARATE without the sharing capability', () => {
        const settings = { mode: HouseholdSharingMode.TOGETHER, areas: {} };
        assert.equal(
            sharingModeFor(VisibilityArea.GROWTH_PLAN, settings, false),
            HouseholdSharingMode.SEPARATE
        );
    });

    it('lets an area choice win over everything else', () => {
        const settings = {
            mode: HouseholdSharingMode.SEPARATE,
            areas: { [VisibilityArea.ENERGY_LOG]: HouseholdSharingMode.TOGETHER },
        };
        assert.equal(
            sharingModeFor(VisibilityArea.ENERGY_LOG, settings, true),
            HouseholdSharingMode.TOGETHER
        );
    });

    it('keeps sensitive areas closed when the household mode is open', () => {
        const settings = { mode: HouseholdSharingMode.TOGETHER, areas: {} };
        for (const area of [VisibilityArea.ENERGY_LOG, VisibilityArea.MONEY_PERSONAL]) {
            assert.equal(sharingModeFor(area, settings, true), HouseholdSharingMode.SEPARATE);
        }
    });

    it('falls back to the household mode (default OWNER_SEES)', () => {
        assert.equal(
            sharingModeFor(VisibilityArea.GROWTH_PLAN, DEFAULT_VISIBILITY_SETTINGS, true),
            HouseholdSharingMode.OWNER_SEES
        );
    });
});

describe('visibilityOptionsFor', () => {
    it('gives the owner every option and members only me / owner under OWNER_SEES', () => {
        const mode = HouseholdSharingMode.OWNER_SEES;
        assert.deepEqual(visibilityOptionsFor({ role: HouseholdRole.OWNER, mode }), [
            VisibilityChoice.PRIVATE,
            VisibilityChoice.HOUSEHOLD,
            VisibilityChoice.SHARED,
        ]);
        assert.deepEqual(visibilityOptionsFor({ role: HouseholdRole.MEMBER, mode }), [
            VisibilityChoice.PRIVATE,
            VisibilityChoice.OWNER,
        ]);
    });

    it('always offers PRIVATE to people who can make rows', () => {
        for (const mode of modes) {
            for (const role of [HouseholdRole.OWNER, HouseholdRole.MEMBER]) {
                assert.ok(
                    visibilityOptionsFor({ role, mode }).includes(VisibilityChoice.PRIVATE),
                    `${role} ${mode}`
                );
            }
            assert.deepEqual(visibilityOptionsFor({ role: HouseholdRole.VIEWER, mode }), []);
        }
    });

    it('preselects the most open personal option unless the person prefers private', () => {
        const options = visibilityOptionsFor({
            role: HouseholdRole.MEMBER,
            mode: HouseholdSharingMode.TOGETHER,
        });
        assert.equal(defaultVisibilityChoice(options, false), VisibilityChoice.HOUSEHOLD);
        assert.equal(defaultVisibilityChoice(options, true), VisibilityChoice.PRIVATE);
    });
});

describe('effectiveVisibility', () => {
    it('clamps a member HOUSEHOLD row to OWNER under OWNER_SEES and PRIVATE under SEPARATE', () => {
        assert.equal(
            effectiveVisibility(
                Visibility.HOUSEHOLD,
                HouseholdRole.MEMBER,
                HouseholdSharingMode.OWNER_SEES
            ),
            Visibility.OWNER
        );
        assert.equal(
            effectiveVisibility(
                Visibility.HOUSEHOLD,
                HouseholdRole.OWNER,
                HouseholdSharingMode.SEPARATE
            ),
            Visibility.PRIVATE
        );
    });

    it('never opens a row beyond what was stored', () => {
        assert.equal(
            effectiveVisibility(
                Visibility.PRIVATE,
                HouseholdRole.OWNER,
                HouseholdSharingMode.TOGETHER
            ),
            Visibility.PRIVATE
        );
    });
});

describe('canSee', () => {
    it('hides private rows from everyone but the maker, the owner included', () => {
        for (const mode of modes) {
            const scope: VisibilityScope = {
                mode,
                makerRoles,
                consentingAccountIds: new Set([OWNER_ID, MEMBER_ID]),
            };
            for (const viewer of viewers) {
                const row = { accountId: MEMBER_ID, visibility: Visibility.PRIVATE };
                assert.equal(canSee(viewer, row, scope), viewer.accountId === MEMBER_ID);
            }
        }
    });

    it('shows member rows shared with the owner to the owner only', () => {
        const scope: VisibilityScope = { mode: HouseholdSharingMode.OWNER_SEES, makerRoles };
        const row = { accountId: MEMBER_ID, visibility: Visibility.OWNER };
        assert.equal(canSee(viewers[0], row, scope), true);
        assert.equal(canSee(seat(HELPER_ID, HouseholdRole.MEMBER), row, scope), false);
    });

    it('never shows personal rows to viewers or EXTERNAL seats', () => {
        const scope: VisibilityScope = { mode: HouseholdSharingMode.TOGETHER, makerRoles };
        const row = { accountId: OWNER_ID, visibility: Visibility.HOUSEHOLD };
        assert.equal(canSee(viewers[2], row, scope), false);
        assert.equal(canSee(viewers[3], row, scope), false);
    });

    it('shows a coach HOUSEHOLD rows only from people who consented', () => {
        const coach = viewers[4];
        const row = { accountId: OWNER_ID, visibility: Visibility.HOUSEHOLD };
        const base = { mode: HouseholdSharingMode.OWNER_SEES, makerRoles };
        assert.equal(canSee(coach, row, base), false);
        assert.equal(
            canSee(coach, row, { ...base, consentingAccountIds: new Set([OWNER_ID]) }),
            true
        );
        const ownerOnly = { accountId: MEMBER_ID, visibility: Visibility.OWNER };
        assert.equal(
            canSee(coach, ownerOnly, { ...base, consentingAccountIds: new Set([MEMBER_ID]) }),
            false
        );
    });

    it('agrees with visibleMakersFor for every viewer, mode and row', () => {
        for (const mode of modes) {
            const scope: VisibilityScope = {
                mode,
                makerRoles,
                consentingAccountIds: new Set([OWNER_ID, MEMBER_ID]),
            };
            for (const viewer of viewers) {
                const makers = visibleMakersFor(viewer, scope);
                for (const row of rows) {
                    const viaSets =
                        row.accountId === null
                            ? makers.isSharedVisible
                            : (makers.isOwnVisible && row.accountId === viewer.accountId) ||
                              makers.byVisibility[row.visibility].includes(row.accountId);
                    assert.equal(
                        viaSets,
                        canSee(viewer, row, scope),
                        `${mode} ${viewer.accountId} ${viewer.role} ${row.accountId} ${row.visibility}`
                    );
                }
            }
        }
    });
});

describe('canEdit / canDelete', () => {
    const together: VisibilityRow = { accountId: null, visibility: Visibility.HOUSEHOLD };

    it('lets only the maker edit personal rows', () => {
        const row = { accountId: MEMBER_ID, visibility: Visibility.HOUSEHOLD };
        assert.equal(canEdit(viewers[0], row, HouseholdSharingMode.TOGETHER), false);
        assert.equal(canEdit(viewers[1], row, HouseholdSharingMode.TOGETHER), true);
    });

    it('makes together rows read-only under SEPARATE and owner-deleted under OWNER_SEES', () => {
        assert.equal(canEdit(viewers[0], together, HouseholdSharingMode.SEPARATE), false);
        assert.equal(canEdit(viewers[1], together, HouseholdSharingMode.OWNER_SEES), true);
        assert.equal(canDelete(viewers[1], together, HouseholdSharingMode.OWNER_SEES), false);
        assert.equal(canDelete(viewers[0], together, HouseholdSharingMode.OWNER_SEES), true);
    });
});

describe('childVisibilityOptions', () => {
    it('never lets a child be more open than its parent', () => {
        const options = [
            VisibilityChoice.PRIVATE,
            VisibilityChoice.HOUSEHOLD,
            VisibilityChoice.SHARED,
        ];
        assert.deepEqual(
            childVisibilityOptions(options, {
                accountId: OWNER_ID,
                visibility: Visibility.PRIVATE,
            }),
            [VisibilityChoice.PRIVATE]
        );
        assert.deepEqual(
            childVisibilityOptions(options, { accountId: null, visibility: Visibility.HOUSEHOLD }),
            options
        );
    });
});

describe('attributionEnabled', () => {
    it('needs Plus+ and more than one participant', () => {
        assert.equal(attributionEnabled({ isEntitled: false, participantCount: 2 }), false);
        assert.equal(attributionEnabled({ isEntitled: true, participantCount: 1 }), false);
        assert.equal(attributionEnabled({ isEntitled: true, participantCount: 2 }), true);
    });
});
