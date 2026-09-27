'use client';

/**
 * Board write access — Practice preview + household VIEWER.
 * When false, hide create/edit chrome and block mutate routes.
 */

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    roleCan,
} from '@/app/_lib/role-permissions';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

function sectionFromPath(pathname: string): HouseholdPermissionSection {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    if (path.includes('/product/growth')) return HouseholdPermissionSection.GROWTH;
    if (path.includes('/product/energy')) return HouseholdPermissionSection.ENERGY;
    if (path.includes('/product/soul')) return HouseholdPermissionSection.SOUL;
    if (path.includes('/product/coach')) return HouseholdPermissionSection.COACH;
    if (path.includes('/settings')) return HouseholdPermissionSection.HOUSEHOLD_SETTINGS;
    if (path.includes('/product/money') || path.startsWith('/product')) {
        return HouseholdPermissionSection.MONEY;
    }
    return HouseholdPermissionSection.HOME;
}

export type BoardWriteAccess = {
    /** Any board write (create / update / delete / settle / sort). */
    canMutate: boolean;
    /** Soft-nav create/update/import routes + primary + Add chrome. */
    showCreateFlows: boolean;
    /** True while Practice is previewing a client board. */
    practicePreview: boolean;
    role: HouseholdRole;
};

/**
 * Single gate for mutation chrome on the household board.
 * Practice preview uses its own caps; otherwise household role CRUD applies.
 */
export function useBoardWriteAccess(): BoardWriteAccess {
    const pathname = usePathname() ?? '/';
    const { householdId, userId } = useAuth();
    const { capabilities } = usePracticePreview();

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        Boolean(householdId) && !capabilities.active
    );

    const role = useMemo(() => {
        if (capabilities.active) {
            // Coach is not a household member — treat as VIEWER unless MANAGE writes ship.
            return HouseholdRole.VIEWER;
        }
        const mine = membersQuery.data?.find(member => member.userId === userId)?.role;
        if (mine) return mine;
        // Fail-open while membership loads so owners do not flash a read-only board.
        if (membersQuery.isPending) return HouseholdRole.OWNER;
        return HouseholdRole.VIEWER;
    }, [capabilities.active, membersQuery.data, membersQuery.isPending, userId]);
    const section = sectionFromPath(pathname);

    return useMemo(() => {
        if (capabilities.active) {
            return {
                canMutate: capabilities.canMutate,
                showCreateFlows: capabilities.showCreateFlows,
                practicePreview: true,
                role,
            };
        }

        const canCreate = roleCan(role, section, HouseholdPermissionAction.CREATE);
        const canUpdate = roleCan(role, section, HouseholdPermissionAction.UPDATE);
        const canDelete = roleCan(role, section, HouseholdPermissionAction.DELETE);

        return {
            canMutate: canCreate || canUpdate || canDelete,
            showCreateFlows: canCreate,
            practicePreview: false,
            role,
        };
    }, [capabilities.active, capabilities.canMutate, capabilities.showCreateFlows, role, section]);
}
