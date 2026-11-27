import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { contract } from '../../../routers';
import { HouseholdRole } from '../enums';
import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    permissionActionFromPath,
    permissionSectionFromPath,
    roleCan,
} from './role-permissions';

describe('permissionActionFromPath', () => {
    it('classifies household removeMember as DELETE', () => {
        assert.equal(
            permissionActionFromPath('/household/removeMember', 'POST'),
            HouseholdPermissionAction.DELETE
        );
    });

    it('classifies growth course reads and carry', () => {
        assert.equal(
            permissionActionFromPath('/growth/course/period', 'POST'),
            HouseholdPermissionAction.READ
        );
        assert.equal(
            permissionActionFromPath('/growth/course/year', 'POST'),
            HouseholdPermissionAction.READ
        );
        assert.equal(
            permissionActionFromPath('/growth/course/carry', 'POST'),
            HouseholdPermissionAction.UPDATE
        );
    });

    it('classifies course rhythm, schedule and feed procedures', () => {
        for (const path of [
            '/growth/course/rhythm/list',
            '/growth/course/rhythm/suggestions',
            '/growth/course/schedule/list',
            '/growth/course/feed/get',
        ]) {
            assert.equal(permissionActionFromPath(path, 'POST'), HouseholdPermissionAction.READ);
        }
        for (const path of [
            '/growth/course/rhythm/tick',
            '/growth/course/rhythm/untick',
            '/growth/course/rhythm/pause',
            '/growth/course/rhythm/confirm',
            '/growth/course/rhythm/renew',
            '/growth/course/schedule/snooze',
            '/growth/course/feed/rotate',
        ]) {
            assert.equal(permissionActionFromPath(path, 'POST'), HouseholdPermissionAction.UPDATE);
        }
    });

    it('classifies optional pot activate/deactivate like updateSplit (UPDATE)', () => {
        for (const leaf of ['updateSplit', 'activate', 'deactivate']) {
            assert.equal(
                permissionActionFromPath(`/money/jars/${leaf}`, 'POST'),
                HouseholdPermissionAction.UPDATE
            );
        }
    });

    it('classifies fixed-cost jar/settlement reads as READ despite POST', () => {
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/byJar', 'POST'),
            HouseholdPermissionAction.READ
        );
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/listSettlements', 'POST'),
            HouseholdPermissionAction.READ
        );
    });

    it('keeps other documented money reads as READ', () => {
        for (const leaf of [
            'inbox',
            'plan',
            'projections',
            'levels',
            'recap',
            'balances',
            'listInstitutions',
        ]) {
            assert.equal(
                permissionActionFromPath(`/money/x/${leaf}`, 'POST'),
                HouseholdPermissionAction.READ,
                leaf
            );
        }
    });

    it('still treats mutations as write actions', () => {
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/create', 'POST'),
            HouseholdPermissionAction.CREATE
        );
        assert.equal(
            permissionActionFromPath('/money/fixedCosts/unlinkSettlement', 'POST'),
            HouseholdPermissionAction.DELETE
        );
    });
});

describe('roleCan VIEWER money', () => {
    it('allows READ on fixedCosts.byJar path classification', () => {
        const action = permissionActionFromPath('/money/fixedCosts/byJar', 'POST');
        assert.equal(roleCan(HouseholdRole.VIEWER, HouseholdPermissionSection.MONEY, action), true);
    });

    it('denies CREATE on money', () => {
        assert.equal(
            roleCan(
                HouseholdRole.VIEWER,
                HouseholdPermissionSection.MONEY,
                HouseholdPermissionAction.CREATE
            ),
            false
        );
    });
});

describe('roleCan VIEWER members', () => {
    it('allows READ so the shell can resolve the look-along seat', () => {
        assert.equal(
            roleCan(
                HouseholdRole.VIEWER,
                HouseholdPermissionSection.HOUSEHOLD_MEMBERS,
                HouseholdPermissionAction.READ
            ),
            true
        );
    });

    it('denies invite / member admin', () => {
        for (const action of [
            HouseholdPermissionAction.CREATE,
            HouseholdPermissionAction.UPDATE,
            HouseholdPermissionAction.DELETE,
        ]) {
            assert.equal(
                roleCan(HouseholdRole.VIEWER, HouseholdPermissionSection.HOUSEHOLD_MEMBERS, action),
                false,
                action
            );
        }
    });
});

describe('permissionSectionFromPath', () => {
    it('leaves the onboarding split preview ungated (signed-in only, no household)', () => {
        assert.equal(permissionSectionFromPath('/household/previewSplit'), null);
    });

    it('still gates onboard on the settings section', () => {
        assert.equal(
            permissionSectionFromPath('/household/onboard'),
            HouseholdPermissionSection.HOUSEHOLD_SETTINGS
        );
    });
});

describe('household seats (invite UIs)', () => {
    const path = '/household/seats';

    it('maps to the members section and the invite action', () => {
        assert.equal(permissionSectionFromPath(path), HouseholdPermissionSection.HOUSEHOLD_MEMBERS);
        assert.equal(permissionActionFromPath(path, 'POST'), HouseholdPermissionAction.CREATE);
    });

    it('is open to OWNER and MEMBER and closed to VIEWER', () => {
        const section = HouseholdPermissionSection.HOUSEHOLD_MEMBERS;
        assert.equal(roleCan(HouseholdRole.OWNER, section, HouseholdPermissionAction.CREATE), true);
        assert.equal(
            roleCan(HouseholdRole.MEMBER, section, HouseholdPermissionAction.CREATE),
            true
        );
        assert.equal(
            roleCan(HouseholdRole.VIEWER, section, HouseholdPermissionAction.CREATE),
            false
        );
    });
});

describe('device registry', () => {
    const write = [
        ['/device/create', HouseholdPermissionAction.CREATE],
        ['/device/update', HouseholdPermissionAction.UPDATE],
        ['/device/delete', HouseholdPermissionAction.DELETE],
    ] as const;

    it('maps every /device procedure to a section, so the role interceptor applies', () => {
        for (const path of ['/device/list', '/device/kinds', ...write.map(([route]) => route)]) {
            assert.equal(permissionSectionFromPath(path), HouseholdPermissionSection.HOME, path);
        }
    });

    it('classifies the catalog read as READ despite POST, and writes as writes', () => {
        assert.equal(
            permissionActionFromPath('/device/kinds', 'POST'),
            HouseholdPermissionAction.READ
        );
        assert.equal(
            permissionActionFromPath('/device/list', 'POST'),
            HouseholdPermissionAction.READ
        );
        for (const [path, action] of write) {
            assert.equal(permissionActionFromPath(path, 'POST'), action, path);
        }
    });

    it('lets OWNER and MEMBER pair, edit and forget, and VIEWER only read', () => {
        const section = HouseholdPermissionSection.HOME;
        for (const role of [HouseholdRole.OWNER, HouseholdRole.MEMBER]) {
            for (const [, action] of write) assert.equal(roleCan(role, section, action), true);
        }
        for (const [, action] of write) {
            assert.equal(roleCan(HouseholdRole.VIEWER, section, action), false);
        }
        for (const role of Object.values(HouseholdRole)) {
            assert.equal(roleCan(role, section, HouseholdPermissionAction.READ), true);
        }
    });
});

/**
 * Guard against the device gap coming back: every procedure of the real router that is not
 * on this list must map to a role section. A new top-level router with no section would
 * otherwise be open to every role, VIEWER and Practice previews included.
 */
describe('every household-scoped procedure is role-gated', () => {
    /** Procedures that are deliberately not gated by the household role matrix, and why. */
    const OPEN_BY_DESIGN: readonly string[] = [
        // Person-scoped (theme, locale, board gate): no household needed.
        '/account/',
        // Public / signed-in, no household data.
        '/plans/',
        '/contact/',
        // Pure maths over the jar catalog, nothing stored (see `permissionSectionFromPath`).
        '/household/previewSplit',
        // Household dual consent: the service enforces "household OWNER" itself
        // (`assertHouseholdOwnerOrAdmin`), which is stricter than the matrix.
        '/household/practiceLinks/',
        // Practice control plane: authorised by `PracticeRole`, not the household role.
        '/practice/',
    ];

    function procedurePaths(node: unknown, prefix: string[] = []): string[] {
        if (!node || typeof node !== 'object') return [];
        if ('~orpc' in node) return [`/${prefix.join('/')}`];
        return Object.entries(node).flatMap(([key, child]) =>
            procedurePaths(child, [...prefix, key])
        );
    }

    const paths = procedurePaths(contract);

    it('walks the real router', () => {
        assert.ok(paths.length > 150, `expected the full router, got ${paths.length} paths`);
        assert.ok(paths.includes('/device/create'));
    });

    it('maps every procedure to a section unless it is open by design', () => {
        const unmapped = paths.filter(
            path =>
                permissionSectionFromPath(path) === null &&
                !OPEN_BY_DESIGN.some(open => path.startsWith(open))
        );
        assert.deepEqual(unmapped, [], `no role section for: ${unmapped.join(', ')}`);
    });

    it('keeps the open-by-design list honest: every entry still matches a real procedure', () => {
        for (const open of OPEN_BY_DESIGN) {
            assert.ok(
                paths.some(path => path.startsWith(open)),
                `${open} matches no procedure; remove it from the list`
            );
        }
    });
});
