/**
 * Household role permissions
 *
 * Orthogonal to plan {@link CAPABILITIES}:
 * - Plan = which features exist on Basic/Plus/Max
 * - Role = what this member may see / mutate inside the household
 *
 * Better-auth roles stay 1:1 with {@link HouseholdRole}:
 * owner (100%) → admin (~80%) → member (day-to-day) → viewer (look-along).
 */

import { HouseholdRole } from '../enums';

/** Product / org surfaces a role can be gated on. */
export enum HouseholdPermissionSection {
    HOUSEHOLD_SETTINGS = 'household.settings',
    HOUSEHOLD_MEMBERS = 'household.members',
    HOUSEHOLD_BILLING = 'household.billing',
    HOME = 'home',
    MONEY = 'money',
    GROWTH = 'growth',
    ENERGY = 'energy',
    SOUL = 'soul',
    COACH = 'coach',
}

export enum HouseholdPermissionAction {
    CREATE = 'create',
    READ = 'read',
    UPDATE = 'update',
    DELETE = 'delete',
}

export type CrudPermissions = Record<HouseholdPermissionAction, boolean>;

export type RolePermissionMatrix = Record<HouseholdPermissionSection, CrudPermissions>;

const NONE: CrudPermissions = {
    [HouseholdPermissionAction.CREATE]: false,
    [HouseholdPermissionAction.READ]: false,
    [HouseholdPermissionAction.UPDATE]: false,
    [HouseholdPermissionAction.DELETE]: false,
};

const READ_ONLY: CrudPermissions = {
    [HouseholdPermissionAction.CREATE]: false,
    [HouseholdPermissionAction.READ]: true,
    [HouseholdPermissionAction.UPDATE]: false,
    [HouseholdPermissionAction.DELETE]: false,
};

const READ_WRITE: CrudPermissions = {
    [HouseholdPermissionAction.CREATE]: true,
    [HouseholdPermissionAction.READ]: true,
    [HouseholdPermissionAction.UPDATE]: true,
    [HouseholdPermissionAction.DELETE]: true,
};

/** Day-to-day board work — no hard deletes of structural rows if we tighten later. */
const DAY_TO_DAY: CrudPermissions = {
    [HouseholdPermissionAction.CREATE]: true,
    [HouseholdPermissionAction.READ]: true,
    [HouseholdPermissionAction.UPDATE]: true,
    [HouseholdPermissionAction.DELETE]: true,
};

function allSections(crud: CrudPermissions): RolePermissionMatrix {
    return {
        [HouseholdPermissionSection.HOUSEHOLD_SETTINGS]: crud,
        [HouseholdPermissionSection.HOUSEHOLD_MEMBERS]: crud,
        [HouseholdPermissionSection.HOUSEHOLD_BILLING]: crud,
        [HouseholdPermissionSection.HOME]: crud,
        [HouseholdPermissionSection.MONEY]: crud,
        [HouseholdPermissionSection.GROWTH]: crud,
        [HouseholdPermissionSection.ENERGY]: crud,
        [HouseholdPermissionSection.SOUL]: crud,
        [HouseholdPermissionSection.COACH]: crud,
    };
}

/**
 * Canonical matrix — source of truth for UI gates and backend enforcement.
 *
 * | Role   | Org (settings / members / billing)     | Product portals      |
 * |--------|----------------------------------------|----------------------|
 * | OWNER  | Full CRUD                              | Full CRUD            |
 * | ADMIN  | Settings+members full; billing R/U     | Full CRUD            |
 * | MEMBER | Settings/members read; no billing      | Day-to-day CRUD      |
 * | VIEWER | No org surfaces                        | Read-only portals    |
 */
export const ROLE_PERMISSIONS: Record<HouseholdRole, RolePermissionMatrix> = {
    [HouseholdRole.OWNER]: allSections(READ_WRITE),

    [HouseholdRole.ADMIN]: {
        ...allSections(READ_WRITE),
        // Admin cannot destroy the household / cancel billing alone — owner keeps that.
        [HouseholdPermissionSection.HOUSEHOLD_SETTINGS]: {
            ...READ_WRITE,
            [HouseholdPermissionAction.DELETE]: false,
        },
        [HouseholdPermissionSection.HOUSEHOLD_BILLING]: {
            [HouseholdPermissionAction.CREATE]: true,
            [HouseholdPermissionAction.READ]: true,
            [HouseholdPermissionAction.UPDATE]: true,
            [HouseholdPermissionAction.DELETE]: false,
        },
    },

    [HouseholdRole.MEMBER]: {
        [HouseholdPermissionSection.HOUSEHOLD_SETTINGS]: READ_ONLY,
        [HouseholdPermissionSection.HOUSEHOLD_MEMBERS]: READ_ONLY,
        [HouseholdPermissionSection.HOUSEHOLD_BILLING]: NONE,
        [HouseholdPermissionSection.HOME]: DAY_TO_DAY,
        [HouseholdPermissionSection.MONEY]: DAY_TO_DAY,
        [HouseholdPermissionSection.GROWTH]: DAY_TO_DAY,
        [HouseholdPermissionSection.ENERGY]: DAY_TO_DAY,
        [HouseholdPermissionSection.SOUL]: DAY_TO_DAY,
        [HouseholdPermissionSection.COACH]: {
            [HouseholdPermissionAction.CREATE]: false,
            [HouseholdPermissionAction.READ]: true,
            [HouseholdPermissionAction.UPDATE]: true, // dismiss tips
            [HouseholdPermissionAction.DELETE]: false,
        },
    },

    [HouseholdRole.VIEWER]: {
        // Look-along: home + money overview only. No growth/energy/soul/coach/members/billing.
        // Settings READ so account prefs still open; household member admin stays closed.
        [HouseholdPermissionSection.HOUSEHOLD_SETTINGS]: READ_ONLY,
        [HouseholdPermissionSection.HOUSEHOLD_MEMBERS]: NONE,
        [HouseholdPermissionSection.HOUSEHOLD_BILLING]: NONE,
        [HouseholdPermissionSection.HOME]: READ_ONLY,
        [HouseholdPermissionSection.MONEY]: READ_ONLY,
        [HouseholdPermissionSection.GROWTH]: NONE,
        [HouseholdPermissionSection.ENERGY]: NONE,
        [HouseholdPermissionSection.SOUL]: NONE,
        [HouseholdPermissionSection.COACH]: NONE,
    },
};

/** True when `role` may perform `action` on `section`. */
export function roleCan(
    role: HouseholdRole,
    section: HouseholdPermissionSection,
    action: HouseholdPermissionAction
): boolean {
    return ROLE_PERMISSIONS[role][section][action];
}

/** True when the role may at least read the section (nav visibility). */
export function roleCanSee(role: HouseholdRole, section: HouseholdPermissionSection): boolean {
    return roleCan(role, section, HouseholdPermissionAction.READ);
}

/** Map HTTP verb → CRUD action (fallback when procedure name is unclear). */
export function permissionActionFromHttpMethod(method: string): HouseholdPermissionAction | null {
    switch (method.toUpperCase()) {
        case 'GET':
        case 'HEAD':
            return HouseholdPermissionAction.READ;
        case 'POST':
            return HouseholdPermissionAction.CREATE;
        case 'PUT':
        case 'PATCH':
            return HouseholdPermissionAction.UPDATE;
        case 'DELETE':
            return HouseholdPermissionAction.DELETE;
        default:
            return null;
    }
}

/**
 * Infer section from an oRPC wire path (`/money/jars/list`, `/household/invite`, …).
 * Returns null for account/auth/system paths (not household-role gated).
 */
export function permissionSectionFromPath(pathname: string): HouseholdPermissionSection | null {
    const path = pathname.split('?')[0]?.toLowerCase() ?? '';
    if (
        path.startsWith('/account') ||
        path.startsWith('/auth') ||
        path.startsWith('/api/auth') ||
        path.startsWith('/contact') ||
        path.startsWith('/plans')
    ) {
        return null;
    }
    if (path.startsWith('/billing') || path.includes('/billing/')) {
        return HouseholdPermissionSection.HOUSEHOLD_BILLING;
    }
    if (
        path.includes('/household/invite') ||
        path.includes('/household/members') ||
        path.endsWith('/members')
    ) {
        return HouseholdPermissionSection.HOUSEHOLD_MEMBERS;
    }
    if (
        path.includes('/household/updatesettings') ||
        path.includes('/household/settings') ||
        path.includes('/household/onboard') ||
        path.includes('/household/current') ||
        path.includes('/household/list')
    ) {
        // list/current are readable identity — treat as settings read surface
        return HouseholdPermissionSection.HOUSEHOLD_SETTINGS;
    }
    if (path.startsWith('/money') || path.includes('/money/')) {
        return HouseholdPermissionSection.MONEY;
    }
    if (path.startsWith('/growth') || path.includes('/growth/')) {
        return HouseholdPermissionSection.GROWTH;
    }
    if (path.startsWith('/energy') || path.includes('/energy/')) {
        return HouseholdPermissionSection.ENERGY;
    }
    if (path.startsWith('/soul') || path.includes('/soul/')) {
        return HouseholdPermissionSection.SOUL;
    }
    if (path.startsWith('/coach') || path.includes('/coach/')) {
        return HouseholdPermissionSection.COACH;
    }
    if (path.startsWith('/home') || path.includes('/home/')) {
        return HouseholdPermissionSection.HOME;
    }
    return null;
}

/**
 * Infer CRUD from the last path segment (`list` → read, `create` → create, …).
 * Falls back to HTTP method when the leaf name is unknown.
 */
export function permissionActionFromPath(
    pathname: string,
    httpMethod: string
): HouseholdPermissionAction {
    const segments = pathname.split('?')[0]?.split('/').filter(Boolean) ?? [];
    const leaf = (segments.at(-1) ?? '').toLowerCase();

    if (
        /^(list|get|status|current|feed|session|summary|history|balances|members|settings|profile)$/.test(
            leaf
        )
    ) {
        return HouseholdPermissionAction.READ;
    }
    if (/^(create|add|invite|import|onboard|complete|checkout|portal)/.test(leaf)) {
        return HouseholdPermissionAction.CREATE;
    }
    if (/^(update|apply|dismiss|sort|schedule|change|set)/.test(leaf)) {
        return HouseholdPermissionAction.UPDATE;
    }
    if (/^(delete|remove|revoke|cancel)/.test(leaf)) {
        return HouseholdPermissionAction.DELETE;
    }

    return permissionActionFromHttpMethod(httpMethod) ?? HouseholdPermissionAction.UPDATE;
}
