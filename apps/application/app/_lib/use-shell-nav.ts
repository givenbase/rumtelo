'use client';

import { usePathname } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { buildNav, type ShellNav } from '@/app/_lib/nav';
import { settingsHref, settingsHrefForPathname } from '@/app/_lib/settings-tabs';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { usePracticePreview } from '@/components/features/shell/practice-preview';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

export type ShellNavState = {
    nav: ShellNav;
    /** VIEWER of the household (not a Practice preview). */
    isViewer: boolean;
    /** True when the person is staff of at least one practice. */
    isPracticeStaff: boolean;
    practiceName: string | null;
};

/**
 * The shell nav for this person right now: role, plan, Practice preview, practice staff
 * and launch surface in one pure `buildNav` call. Shared by the shell and Quick add so
 * both read the same rules.
 */
export function useShellNav(): ShellNavState {
    const pathname = usePathname() ?? '/';
    const { plan, planReady, hasCapability } = usePlanCapabilities();
    const { capabilities } = usePracticePreview();
    const { role, membershipRole, canSeeCoach } = useBoardWriteAccess();
    const practiceListQuery = useLiveQuery(apiQuery.practice.list.queryOptions(), [], true);
    const practices = practiceListQuery.data ?? [];
    const isViewer = role === HouseholdRole.VIEWER && !capabilities.active;

    const nav = buildNav({
        role,
        membershipKnown: membershipRole !== null,
        plan,
        planReady,
        has: hasCapability,
        preview: {
            active: capabilities.active,
            showCoachNav: capabilities.showCoachNav,
            showSettings: capabilities.showSettings,
            // The Help sheet is hosted by the header button, which needs a known role.
            showPageHelp: capabilities.showPageHelp && canSeeCoach,
        },
        isPracticeStaff: practices.length > 0,
        settingsHref: isViewer ? settingsHref('account') : settingsHrefForPathname(pathname),
    });

    return {
        nav,
        isViewer,
        isPracticeStaff: practices.length > 0,
        practiceName: practices[0]?.displayName || practices[0]?.legalName || null,
    };
}
