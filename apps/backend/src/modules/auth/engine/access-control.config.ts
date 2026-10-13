/**
 * Household roles for the organization plugin.
 *
 * Product ladder is Owner / Member / Viewer (`HouseholdRole` in contracts).
 * Better-auth still registers **admin** for legacy rows; new invites only use
 * member | viewer. Service-layer mapRole collapses BA `admin` → MEMBER.
 *
 * - **owner** — creator (100% control)
 * - **admin** — legacy only; treated as member in the product
 * - **member** — day-to-day write + invite when plan allows
 * - **viewer** — look-along only
 *
 * Seat add-ons (`SeatAddonKind`) are billing inventory, not roles.
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
