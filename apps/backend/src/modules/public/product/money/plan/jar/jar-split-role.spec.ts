import { describe, expect, it } from 'vitest';

import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    HouseholdRole,
    permissionActionFromPath,
    permissionSectionFromPath,
    roleCan,
} from '@rumtelo/contracts';

/**
 * `updateSplit` rewrites the whole board, so it must classify as a MONEY write. The
 * interceptor derives the check from the wire path, so a rename that dodged the `update`
 * prefix would silently open it to VIEWER.
 */
describe('jar split role gate', () => {
    const wirePath = '/money/jars/updateSplit';

    it('classifies updateSplit as a MONEY update', () => {
        expect(permissionSectionFromPath(wirePath)).toBe(HouseholdPermissionSection.MONEY);
        expect(permissionActionFromPath(wirePath, 'POST')).toBe(HouseholdPermissionAction.UPDATE);
    });

    it('lets OWNER and MEMBER save the split but never VIEWER', () => {
        const section = HouseholdPermissionSection.MONEY;
        const action = HouseholdPermissionAction.UPDATE;
        expect(roleCan(HouseholdRole.OWNER, section, action)).toBe(true);
        expect(roleCan(HouseholdRole.MEMBER, section, action)).toBe(true);
        expect(roleCan(HouseholdRole.VIEWER, section, action)).toBe(false);
    });
});

/**
 * Turning an optional pot on or off rewrites the split (the main pot gives or takes its
 * share), so both procedures must classify as a MONEY update, never a read.
 */
describe.each(['activate', 'deactivate'])('optional pot role gate: %s', procedure => {
    const wirePath = `/money/jars/${procedure}`;

    it('classifies it as a MONEY update', () => {
        expect(permissionSectionFromPath(wirePath)).toBe(HouseholdPermissionSection.MONEY);
        expect(permissionActionFromPath(wirePath, 'POST')).toBe(HouseholdPermissionAction.UPDATE);
    });

    it('lets OWNER and MEMBER do it but never VIEWER', () => {
        const section = HouseholdPermissionSection.MONEY;
        const action = HouseholdPermissionAction.UPDATE;
        expect(roleCan(HouseholdRole.OWNER, section, action)).toBe(true);
        expect(roleCan(HouseholdRole.MEMBER, section, action)).toBe(true);
        expect(roleCan(HouseholdRole.VIEWER, section, action)).toBe(false);
    });
});
