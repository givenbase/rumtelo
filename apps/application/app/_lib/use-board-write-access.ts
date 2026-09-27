'use client';

/**
 * Board write access — Practice preview + household VIEWER + closed / future period.
 * When false, hide create/edit chrome and block mutate routes.
 */

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { describePeriodTravel, toPeriodKey } from '@rumtelo/utils';

import { apiQuery } from '@/app/_lib/api-hooks';
import {
    HouseholdPermissionAction,
    HouseholdPermissionSection,
    roleCan,
} from '@/app/_lib/role-permissions';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
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
    /** Viewed shell period is closed — board is frozen for that month. */
    periodClosed: boolean;
    /** Looking ahead — projection only; no creates or settles. */
    periodLookingAhead: boolean;
    role: HouseholdRole;
};

/**
 * Single gate for mutation chrome on the household board.
 * Practice preview uses its own caps; otherwise household role CRUD applies.
 * Closed months and future travel freeze create/update chrome for the viewed period.
 */
export function useBoardWriteAccess(): BoardWriteAccess {
    const pathname = usePathname() ?? '/';
    const { householdId, userId } = useAuth();
    const { period } = useHouseholdShell();
    const { capabilities } = usePracticePreview();
    const periodKey = toPeriodKey(period.year, period.month);
    const periodLookingAhead = describePeriodTravel(period).direction === 'future';

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        Boolean(householdId) && !capabilities.active
    );

    const monthScoreQuery = useLiveQuery(
        apiQuery.money.monthScore.current.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        { isClosed: false } as never,
        Boolean(householdId)
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
    const periodClosed = monthScoreQuery.data?.isClosed;
    const periodFrozen = periodClosed || periodLookingAhead;

    return useMemo(() => {
        if (capabilities.active) {
            return {
                canMutate: capabilities.canMutate && !periodFrozen,
                showCreateFlows: capabilities.showCreateFlows && !periodFrozen,
                practicePreview: true,
                periodClosed,
                periodLookingAhead,
                role,
            };
        }

        const canCreate = roleCan(role, section, HouseholdPermissionAction.CREATE);
        const canUpdate = roleCan(role, section, HouseholdPermissionAction.UPDATE);
        const canDelete = roleCan(role, section, HouseholdPermissionAction.DELETE);

        return {
            canMutate: (canCreate || canUpdate || canDelete) && !periodFrozen,
            showCreateFlows: canCreate && !periodFrozen,
            practicePreview: false,
            periodClosed,
            periodLookingAhead,
            role,
        };
    }, [
        capabilities.active,
        capabilities.canMutate,
        capabilities.showCreateFlows,
        periodClosed,
        periodFrozen,
        periodLookingAhead,
        role,
        section,
    ]);
}
