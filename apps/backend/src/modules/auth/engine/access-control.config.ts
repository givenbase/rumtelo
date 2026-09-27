/**
 * Household roles for the organization plugin.
 *
 * Better-auth roles (keep 1:1 with {@link HouseholdRole} in contracts):
 * - **owner** — creator of the household / company (100% control)
 * - **admin** — high trust (~80%); org/member/invite mutations, not the creator
 * - **member** — limited write; day-to-day board work, no org admin
 * - **viewer** — look-along only; no organization / member / invitation mutations
 *
 * Relationship labels ("Partner", "Kid") are UI copy from household kind — never roles.
 *
 * Seat add-ons (`SeatAddonKind`) are billing inventory, not roles: a CONTRIBUTOR
 * seat may be filled by admin or member; a VIEWER seat only by viewer.
 */
import { createAccessControl } from 'better-auth/plugins/access';
import {
    adminAc,
    defaultStatements,
    memberAc,
    ownerAc,
} from 'better-auth/plugins/organization/access';

export const householdAccessControl = createAccessControl(defaultStatements);

export const householdRoles = {
    owner: householdAccessControl.newRole(ownerAc.statements),
    admin: householdAccessControl.newRole(adminAc.statements),
    member: householdAccessControl.newRole(memberAc.statements),
    /** Read-only guest tier: no organization, member or invitation mutations. */
    viewer: householdAccessControl.newRole({
        organization: [],
        member: [],
        invitation: [],
        team: [],
        ac: ['read'],
    }),
};
