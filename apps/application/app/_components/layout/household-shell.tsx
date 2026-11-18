'use client';

import { useEffect, useState, type ReactNode } from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { RumteloLogo } from '@rumtelo/brand';
import { useTranslations } from '@rumtelo/i18n';
import { Icon } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { activeGrowthSubnavKey, activeMoneySubnavKey, activeTabForPath } from '@/app/_lib/nav';
import { consumeTourOfferPending } from '@/app/_lib/offer-tour-flag';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useShellNav } from '@/app/_lib/use-shell-nav';
import { BoardMutateRouteGuard } from '@/components/features/shell/board-mutate-route-guard';
import { CapabilityGate } from '@/components/features/shell/capability-gate';
import { PendingPlanCheckout } from '@/components/features/shell/pending-plan-checkout';
import { PendingPracticeInviteRedeem } from '@/components/features/shell/pending-practice-invite-redeem';
import { usePracticePreview } from '@/components/features/shell/practice-preview';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { ViewerPortalRouteGuard } from '@/components/features/shell/viewer-portal-route-guard';
import { FeatureHelpersProvider, WhyCaption } from '@/components/features/helpers';
import { PageHelpButton, PageTourProvider, usePageTour } from '@/components/features/tour';
import { PageContentWidthProvider } from '@/components/layout/page-content-width';

import { PeriodSelector } from './period-selector';
import { PeriodTravelBanner } from './period-travel-banner';
import { PracticePreviewBanner } from './practice-preview-banner';
import { QuickAddFab } from './quick-add';
import { AvatarMenu } from './shell-nav/avatar-menu';
import { BottomTabs } from './shell-nav/bottom-tabs';
import { ComingUpSheet } from './shell-nav/coming-up-sheet';
import { PortalPills } from './shell-nav/portal-pills';
import { ProductSubnav } from './shell-nav/product-subnav';
import { StageNote } from './shell-nav/stage-note';
import { YouSheet } from './shell-nav/you-sheet';
import type { YouRowActions } from './shell-nav/you-rows';

// ── Public export ─────────────────────────────────────────────────────────────

/**
 * Household product chrome — portal nav, plan gates, period travel.
 * Sibling of PracticeShell; Practice routes skip this via AppBootGate.
 * `HouseholdShellProvider` lives in `app/providers.tsx`; this component consumes it.
 */
export function HouseholdShell({ children }: { children: ReactNode }) {
    return (
        <FeatureHelpersProvider>
            <PageContentWidthProvider>
                <PageTourProvider>
                    <HouseholdShellInner>{children}</HouseholdShellInner>
                </PageTourProvider>
            </PageContentWidthProvider>
        </FeatureHelpersProvider>
    );
}

// ── Also re-export useHouseholdShell so consumers don't need two imports ────────────
export { useHouseholdShell } from '@/components/features/shell/household-shell-context';

// ── Inner shell (has access to context) ──────────────────────────────────────

function HouseholdShellInner({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname() ?? '/';
    const [youOpen, setYouOpen] = useState(false);
    const [comingUpOpen, setComingUpOpen] = useState(false);
    const { householdId } = useAuth();
    const { accessForPath } = usePlanCapabilities();
    const { capabilities, exitPreview } = usePracticePreview();
    const { canMutate, canSeeCoach } = useBoardWriteAccess();
    const { nav, isViewer, stage, stageReady, stageFromServer, showAll, additionsSince, progress } =
        useShellNav();
    const comingUp = nav.youRows.find(row => row.kind === 'coming_up') ?? null;
    const { requestTourOffer, setHelpOpen } = usePageTour();
    const activeTab = activeTabForPath(pathname);
    const access = accessForPath(pathname);

    // After jar-bank setup on the onboarding page, a session flag triggers
    // the tour offer once the user lands back in the shell.
    useEffect(() => {
        if (!consumeTourOfferPending()) return;
        requestTourOffer();
    }, [requestTourOffer]);

    const youActions: YouRowActions = {
        onNavigate: () => setYouOpen(false),
        onHelp: () => setHelpOpen(true),
        onExitPreview: exitPreview,
        onComingUp: () => {
            setYouOpen(false);
            setComingUpOpen(true);
        },
    };

    return (
        <div
            className={cn(
                'min-h-dvh bg-bg bg-(image:--gradient-page) bg-top bg-no-repeat',
                capabilities.active && 'ring-4 ring-accent/35 ring-inset'
            )}
            data-practice-preview={capabilities.active ? 'true' : undefined}
            data-board-readonly={!canMutate ? 'true' : undefined}
            data-practice-readonly={
                capabilities.active && !capabilities.canMutate ? 'true' : undefined
            }>
            {/* Sticky chrome: preview strip + header stay pinned together */}
            <div className="sticky top-[var(--staging-banner-h,0px)] z-40">
                <PracticePreviewBanner />
                {/* ── HEADER ──────────────────────────────────────────────────── */}
                <header
                    data-app-chrome-header
                    className={cn(
                        'bg-chrome backdrop-blur-md',
                        capabilities.active && 'border-b-2 border-accent/50'
                    )}>
                    <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4">
                        {/* Wordmark: the icon on narrow phones and on tablet, where the pills need the room */}
                        <Link
                            href="/"
                            className="relative z-10 flex shrink-0 items-center gap-2"
                            data-tour="shell-brand">
                            <RumteloLogo
                                variant="icon"
                                className="h-8 w-auto min-[380px]:max-md:hidden lg:hidden"
                            />
                            <RumteloLogo
                                variant="wordmark"
                                className="hidden h-7 w-auto max-w-[9.5rem] min-[380px]:max-md:block lg:block"
                            />
                            {capabilities.active ? (
                                <span className="hidden items-center gap-1 rounded-full bg-accent px-2 py-0.5 font-mono text-[9px] font-bold tracking-wide text-on-accent uppercase sm:inline-flex">
                                    <Icon name="eye" size="sm" className="text-on-accent" />
                                    {t('pages.shell.practice_preview.eyebrow')}
                                </span>
                            ) : null}
                        </Link>

                        {/* Portal pills — desktop. On phones the bottom tabs carry this. */}
                        <PortalPills tabs={nav.tabs} activeTab={activeTab} />

                        <div className="ml-auto flex shrink-0 items-center gap-2">
                            <div data-tour="shell-period">
                                <PeriodSelector />
                            </div>
                            {/* Help is Coach teaching chrome — role gate, not tip preference. */}
                            {canSeeCoach && capabilities.showPageHelp ? <PageHelpButton /> : null}
                            <AvatarMenu
                                rows={nav.youRows}
                                pathname={pathname}
                                actions={youActions}
                                isViewer={isViewer}
                                active={activeTab === 'you'}
                            />
                        </div>
                    </div>

                    {/* Product sections (Money, Growth): one row of links, same on every width */}
                    {activeTab === 'money' && nav.moneySubnav.length > 0 ? (
                        <div className="border-t-2 border-t-jar-give bg-bg-app">
                            <div className="mx-auto max-w-7xl px-4 py-2">
                                <ProductSubnav
                                    items={nav.moneySubnav}
                                    activeKey={activeMoneySubnavKey(pathname)}
                                    ariaLabel={t('pages.nav.aria.money_sections')}
                                />
                            </div>
                        </div>
                    ) : null}
                    {activeTab === 'growth' && nav.growthSubnav.length > 0 ? (
                        <div className="border-t-2 border-t-jar-give bg-bg-app">
                            <div className="mx-auto max-w-7xl px-4 py-2">
                                <ProductSubnav
                                    items={nav.growthSubnav}
                                    activeKey={activeGrowthSubnavKey(pathname)}
                                    ariaLabel={t('pages.nav.aria.growth_sections')}
                                />
                            </div>
                        </div>
                    ) : null}
                </header>
            </div>

            {/* ── MAIN ─────────────────────────────────────────────────────── */}
            <div className="mx-auto max-w-7xl px-4 py-8 pb-24 md:pb-8">
                {!access.locked && <PeriodTravelBanner />}
                {isViewer ? (
                    <aside
                        role="status"
                        aria-label={t('pages.shell.viewer.look_along')}
                        className="mb-6 flex flex-col gap-3 rounded-2xl border border-line bg-surface px-3 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
                        <div className="grid min-w-0 gap-1">
                            <p className="font-mono text-xs font-semibold tracking-wide text-fg-muted uppercase">
                                {t('pages.shell.viewer.look_along')}
                            </p>
                            <p className="text-sm text-fg-secondary">
                                {t('pages.shell.viewer.start_own_banner')}
                            </p>
                        </div>
                        <Link
                            href="/onboarding/start"
                            className="focus-visible:ring-offset-canvas inline-flex min-h-10 w-full shrink-0 items-center justify-center rounded-full bg-accent px-4 py-2 text-center text-sm font-semibold text-on-accent transition outline-none hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 sm:w-auto">
                            {t('pages.shell.viewer.start_own_cta')}
                        </Link>
                    </aside>
                ) : null}
                {capabilities.showWhyCaption ? (
                    <WhyCaption pathname={pathname} locked={access.locked} />
                ) : null}
                <main className="min-w-0">
                    <StageNote
                        householdId={householdId}
                        stage={stage}
                        ready={stageReady && stageFromServer}
                        suppressed={capabilities.active || showAll}
                        additionsSince={additionsSince}
                        dismissSignal={youOpen}
                    />
                    <CapabilityGate>
                        <ViewerPortalRouteGuard>
                            <BoardMutateRouteGuard>{children}</BoardMutateRouteGuard>
                        </ViewerPortalRouteGuard>
                    </CapabilityGate>
                </main>
            </div>

            {/* ── BOTTOM TABS + YOU (mobile) ───────────────────────────────── */}
            <BottomTabs
                tabs={nav.tabs}
                activeTab={activeTab}
                youOpen={youOpen}
                onOpenYou={() => setYouOpen(true)}
            />
            <YouSheet
                open={youOpen}
                onOpenChange={setYouOpen}
                rows={nav.youRows}
                pathname={pathname}
                actions={youActions}
                isViewer={isViewer}
            />
            <ComingUpSheet
                open={comingUpOpen}
                onOpenChange={setComingUpOpen}
                data={comingUp?.kind === 'coming_up' ? comingUp : null}
                progress={progress}
            />

            {/* ── OVERLAYS ─────────────────────────────────────────────────── */}
            {capabilities.showQuickAdd && canMutate ? <QuickAddFab /> : null}
            {capabilities.showPlanCheckout ? <PendingPlanCheckout /> : null}
            <PendingPracticeInviteRedeem />
        </div>
    );
}
