'use client';

import { usePathname } from 'next/navigation';

import { useQuery } from '@tanstack/react-query';

import { HouseholdRole, type BoardStage, type MoneyProgress } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';

import { apiQuery } from '@/app/_lib/api-hooks';
import { effectiveStage } from '@/app/_lib/board-stage';
import {
    buildNav,
    stageAdditions,
    type NavContext,
    type ShellNav,
    type StageItem,
} from '@/app/_lib/nav';
import { isLiveData } from '@/app/_lib/preview';
import { settingsHref, settingsHrefForPathname } from '@/app/_lib/settings-tabs';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePracticePreview } from '@/components/features/shell/practice-preview';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

export type ShellNavState = {
    nav: ShellNav;
    /** VIEWER of the household (not a Practice preview). */
    isViewer: boolean;
    /** True when the person is staff of at least one practice. */
    isPracticeStaff: boolean;
    practiceName: string | null;
    /**
     * Board stage after the Practice preview and this person's "Show everything now".
     * Decides what the menu shows up front; it never gates a page.
     */
    stage: BoardStage;
    /** False while the first stage read is in flight (reserve the Growth slot, no flash). */
    stageReady: boolean;
    /** The stage came from a successful server read (not a fail-open fallback). */
    stageFromServer: boolean;
    /** This person turned the ladder off (every household). */
    showAll: boolean;
    /** What the menu shows now that it did not at `from` (for the "New in your menu" note). */
    additionsSince: (from: BoardStage) => StageItem[];
    /** The server's progress read; null until it arrives (and in a Practice preview). */
    progress: MoneyProgress | null;
};

/**
 * The shell nav for this person right now: role, plan, Practice preview, practice staff
 * and launch surface in one pure `buildNav` call. Shared by the shell and Quick add so
 * both read the same rules.
 */
export function useShellNav(): ShellNavState {
    const pathname = usePathname() ?? '/';
    const { householdId } = useAuth();
    const { plan, planReady, hasCapability } = usePlanCapabilities();
    const { capabilities } = usePracticePreview();
    const { role, membershipRole, canSeeCoach } = useBoardWriteAccess();
    const practiceListQuery = useLiveQuery(apiQuery.practice.list.queryOptions(), [], true);
    const practices = practiceListQuery.data ?? [];
    const isViewer = role === HouseholdRole.VIEWER && !capabilities.active;

    // The ladder (CL-12). One shared read per household; the Practice preview needs none.
    const live = isLiveData(householdId);
    const accountSettingsQuery = useQuery({
        ...apiQuery.account.settings.queryOptions(),
        enabled: live && !capabilities.active,
    });
    const showAll = accountSettingsQuery.data?.showAllSurfaces === true;
    const progressQuery = useQuery({
        ...apiQuery.money.progress.get.queryOptions({ input: { householdId: householdId! } }),
        enabled: live && !capabilities.active && !showAll && accountSettingsQuery.isFetched,
    });
    const accountSettled = accountSettingsQuery.isFetched;
    const resolved = effectiveStage({
        previewActive: capabilities.active || !live,
        showAll,
        server: !accountSettled
            ? { status: 'pending' }
            : {
                  // A refetch that fails keeps the last known stage; only a first failure fails open.
                  status: progressQuery.data ? 'success' : progressQuery.status,
                  stage: progressQuery.data?.stage,
              },
    });

    const navContext: NavContext = {
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
        stage: resolved.stage,
        stageReady: resolved.ready,
        hasClosedMonth: progressQuery.data?.hasClosedMonth ?? false,
    };
    const nav = buildNav(navContext);

    return {
        nav,
        isViewer,
        isPracticeStaff: practices.length > 0,
        practiceName: practices[0]?.displayName || practices[0]?.legalName || null,
        stage: resolved.stage,
        stageReady: resolved.ready,
        // True only when the stage came from the server — a failed read fails open to MONTH for
        // the menu, but must never trigger the one-time "New in your menu" note.
        stageFromServer: Boolean(progressQuery.data),
        showAll,
        additionsSince: from => stageAdditions(navContext, from, resolved.stage),
        progress: capabilities.active ? null : (progressQuery.data ?? null),
    };
}
