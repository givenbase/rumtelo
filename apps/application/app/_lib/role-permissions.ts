/**
 * Role permission helpers for the app shell.
 * Plan gates stay in `plan.ts` / `usePlanCapabilities` — this is membership ACL.
 */

import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    type HouseholdRole,
    ROLE_PERMISSIONS,
    roleCan,
    roleCanSee,
    type CrudPermissions,
    type RolePermissionMatrix,
} from '@rumtelo/contracts';

export {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    ROLE_PERMISSIONS,
    roleCan,
    roleCanSee,
    type CrudPermissions,
    type RolePermissionMatrix,
};

/** Sections the role may open in nav (read). */
export function visibleSectionsForRole(role: HouseholdRole): HouseholdPermissionSection[] {
    return (Object.keys(ROLE_PERMISSIONS[role]) as HouseholdPermissionSection[]).filter(section =>
        roleCanSee(role, section)
    );
}

/** CRUD flags for one section — handy for disabling form buttons. */
export function crudForRole(
    role: HouseholdRole,
    section: HouseholdPermissionSection
): CrudPermissions {
    return ROLE_PERMISSIONS[role][section];
}

export function canInviteWithRole(actor: HouseholdRole): boolean {
    return roleCan(
        actor,
        HouseholdPermissionSection.HOUSEHOLD_MEMBERS,
        HouseholdPermissionAction.CREATE
    );
}
