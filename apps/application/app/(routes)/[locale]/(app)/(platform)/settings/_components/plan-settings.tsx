'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRouter, useSearchParams } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, StubNotice, Typography } from '@rumtelo/ui';
import { clearPlanIntent, cn, formatPlanPrice } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { env } from '@/app/_utils/get-env';
import { diffPlans, memberLimitLabel, planLabel, PLAN_RANK, PlanKey } from '@/app/_lib/plan';
import { PREVIEW_MODE } from '@/app/_lib/preview';
import { isDemoAccountEmail } from '@rumtelo/contracts/platform';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

import { SettingsInkCard, SettingsPanel } from './settings-chrome';
import { PlanChangeDialog } from './plan-change-dialog';

export function PlanSettings() {
    const t = useTranslations();
    const appLocale = useLocale();
    const queryClient = useQueryClient();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { householdId, user } = useAuth();
    const { showToast, plan, setPlan } = useAppShell();
    const apiError = useApiError();
    const [billing, setBilling] = useState<'month' | 'year'>('month');
    const [pendingPlan, setPendingPlan] = useState<PlanKey | null>(null);
    const isDemoAccount = isDemoAccountEmail(user?.email);

    const billingStatus = useLiveQuery(
        apiQuery.billing.status.queryOptions({ input: { householdId: householdId! } }),
        {
            stripeEnabled: false,
            previewBypass: false,
            planKey: PlanKey.BASIC,
            periodEndsAt: null,
            periodStartedAt: null,
            willCancelAtPeriodEnd: false,
            scheduledPlanKey: null,
            hasStripeCustomer: false,
            hasActiveSubscription: false,
            prices: null,
        },
        Boolean(householdId) && !PREVIEW_MODE
    );

    /** Stripe Checkout / Portal when backend reports stripeEnabled. */
    const stripeLive = !PREVIEW_MODE && billingStatus.data?.stripeEnabled;
    /** Explicit free switches (preview mode or BILLING_PREVIEW_BYPASS). */
    const freePlanSwitch = PREVIEW_MODE || billingStatus.data?.previewBypass;
    /** No Stripe and no bypass — paid upgrades blocked; stay on Basic. */
    const billingUnavailable = !stripeLive && !freePlanSwitch;
    const pendingDiff = pendingPlan ? diffPlans(plan, pendingPlan, t) : null;
    const pendingNeedsCheckout =
        Boolean(pendingPlan) &&
        pendingPlan !== PlanKey.BASIC &&
        stripeLive &&
        pendingDiff?.direction === 'upgrade';
    const pendingPeriodEndDowngrade =
        Boolean(pendingPlan) && stripeLive && pendingDiff?.direction === 'downgrade';

    // Return from Checkout or Customer Portal — refresh entitlement from webhooks.
    useEffect(() => {
        const checkoutResult = searchParams.get('checkout');
        const billingReturn = searchParams.get('billing');
        if (!checkoutResult && billingReturn !== 'return') return;

        void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
        void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });

        if (checkoutResult === 'success') {
            showToast(t('pages.settings.toasts.payment_received'), 'success');
            clearPlanIntent({
                domainUrls: [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP],
            });
        } else if (billingReturn === 'return') {
            showToast(t('pages.settings.toasts.billing_updated'), 'info');
        }

        router.replace('/settings/general/plan');
    }, [searchParams, queryClient, router, showToast, t]);

    const savePlan = useMutation({
        mutationFn: async (next: PlanKey) => {
            if (!householdId) throw new Error('No household');
            return api.household.updateSettings({ householdId, planKey: next });
        },
        onSuccess: data => {
            setPlan(data.planKey);
            setPendingPlan(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
            showToast(
                t('pages.settings.toasts.plan_selected', { plan: planLabel(data.planKey, t) }),
                'success'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const scheduleDowngrade = useMutation({
        mutationFn: async (next: typeof PlanKey.BASIC | typeof PlanKey.PLUS) => {
            if (!householdId) throw new Error('No household');
            return api.billing.schedulePlanChange({ householdId, planKey: next });
        },
        onSuccess: data => {
            setPlan(data.planKey);
            setPendingPlan(null);
            void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
            const until = data.periodEndsAt
                ? new Date(data.periodEndsAt).toLocaleDateString(appLocale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                  })
                : null;
            const nextLabel = data.scheduledPlanKey ? planLabel(data.scheduledPlanKey, t) : null;
            showToast(
                until && nextLabel
                    ? t('pages.settings.toasts.plan_until_then', {
                          plan: planLabel(data.planKey, t),
                          until,
                          next: nextLabel,
                      })
                    : t('pages.settings.toasts.plan_kept_until', {
                          plan: planLabel(data.planKey, t),
                      }),
                'success'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const checkout = useMutation({
        mutationFn: async (next: typeof PlanKey.PLUS | typeof PlanKey.MAX) => {
            if (!householdId) throw new Error('No household');
            return api.billing.createCheckoutSession({
                householdId,
                planKey: next,
                interval: billing,
            });
        },
        onSuccess: ({ url, applied }, next) => {
            if (url) {
                window.location.assign(url);
                return;
            }
            if (applied) {
                setPlan(next);
                setPendingPlan(null);
                void queryClient.invalidateQueries({ queryKey: apiQuery.household.settings.key() });
                void queryClient.invalidateQueries({ queryKey: apiQuery.billing.status.key() });
                showToast(
                    t('pages.settings.toasts.plan_upgraded', { plan: planLabel(next, t) }),
                    'success'
                );
            }
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const openPortal = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.billing.createPortalSession({ householdId });
        },
        onSuccess: ({ url }) => {
            window.location.assign(url);
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function choosePlan(next: PlanKey) {
        if (isDemoAccount) {
            showToast(t('pages.settings.toasts.demo_plan'), 'info');
            return;
        }
        if (plan === next) {
            showToast(
                t('pages.settings.toasts.already_on_plan', { plan: planLabel(next, t) }),
                'info'
            );
            return;
        }
        const upgrading = PLAN_RANK[next] > PLAN_RANK[plan];
        if (upgrading && billingUnavailable) {
            showToast(t('pages.settings.toasts.stripe_unconfigured'), 'error');
            return;
        }
        setPendingPlan(next);
    }

    function confirmPlanChange() {
        if (!pendingPlan || !pendingDiff) return;
        if (pendingDiff.direction === 'upgrade' && billingUnavailable) {
            showToast(t('pages.settings.toasts.stripe_unconfigured'), 'error');
            setPendingPlan(null);
            return;
        }
        if (pendingNeedsCheckout && (pendingPlan === PlanKey.PLUS || pendingPlan === PlanKey.MAX)) {
            checkout.mutate(pendingPlan);
            return;
        }
        if (
            pendingPeriodEndDowngrade &&
            (pendingPlan === PlanKey.BASIC || pendingPlan === PlanKey.PLUS)
        ) {
            scheduleDowngrade.mutate(pendingPlan);
            return;
        }
        // Free preview bypass, or downgrade without Stripe
        savePlan.mutate(pendingPlan);
    }

    const busy =
        savePlan.isPending ||
        checkout.isPending ||
        scheduleDowngrade.isPending ||
        openPortal.isPending ||
        billingStatus.isLoading;
    const scheduledPlanKey = billingStatus.data?.scheduledPlanKey ?? null;
    const periodEndsAt = billingStatus.data?.periodEndsAt ?? null;
    const hasActiveSubscription = billingStatus.data?.hasActiveSubscription;

    const cards: {
        key: PlanKey;
        /** Fallback major units when Stripe catalog is unavailable. */
        priceM: number;
        priceY: number;
        tag: string;
        line: string;
        feats: string;
    }[] = [
        {
            key: PlanKey.BASIC,
            priceM: 0,
            priceY: 0,
            tag: t('pages.settings.panels.plan.card_basic_tag', {
                price: formatPlanPrice(0),
            }),
            line: t('pages.settings.panels.plan.card_basic_line'),
            feats: t('pages.settings.panels.plan.card_basic_feats', {
                members: memberLimitLabel(PlanKey.BASIC, t),
            }),
        },
        {
            key: PlanKey.PLUS,
            priceM: 9,
            priceY: 90,
            tag: t('pages.settings.panels.plan.card_plus_tag'),
            line: t('pages.settings.panels.plan.card_plus_line'),
            feats: t('pages.settings.panels.plan.card_plus_feats', {
                members: memberLimitLabel(PlanKey.PLUS, t),
            }),
        },
        {
            key: PlanKey.MAX,
            priceM: 19,
            priceY: 190,
            tag: t('pages.settings.panels.plan.card_max_tag'),
            line: t('pages.settings.panels.plan.card_max_line'),
            feats: t('pages.settings.panels.plan.card_max_feats', {
                members: memberLimitLabel(PlanKey.MAX, t),
            }),
        },
    ];

    const stripePrices = billingStatus.data?.prices;

    function displayCents(card: (typeof cards)[number], yearly: boolean): number {
        if (card.key === PlanKey.BASIC) return 0;
        const slot =
            card.key === PlanKey.PLUS
                ? yearly
                    ? stripePrices?.PLUS.year
                    : stripePrices?.PLUS.month
                : yearly
                  ? stripePrices?.MAX.year
                  : stripePrices?.MAX.month;
        if (slot) return slot.amountCents;
        return (yearly ? card.priceY : card.priceM) * 100;
    }
    return (
        <SettingsPanel>
            <SettingsInkCard
                eyebrow={t('pages.settings.panels.plan.eyebrow')}
                blurb={t('pages.settings.panels.plan.blurb')}
                badge={
                    <div className="flex gap-1 rounded-full bg-raised p-1">
                        {(
                            [
                                ['month', t('pages.settings.panels.plan.monthly')],
                                ['year', t('pages.settings.panels.plan.yearly')],
                            ] as const
                        ).map(([k, label]) => (
                            <button
                                key={k}
                                type="button"
                                onClick={() => setBilling(k)}
                                className={cn(
                                    'rounded-full px-3.5 py-2 font-mono text-[10px] font-medium tracking-wide uppercase',
                                    billing === k
                                        ? 'bg-accent text-on-accent'
                                        : 'text-fg-muted hover:text-fg'
                                )}>
                                {label}
                            </button>
                        ))}
                    </div>
                }>
                <div className="grid gap-2 py-2.5">
                    {cards.map(card => {
                        const yearly = billing === 'year';
                        const cur = plan === card.key;
                        const cents = displayCents(card, yearly);
                        const price = formatPlanPrice(cents);
                        return (
                            <div
                                key={card.key}
                                className={cn(
                                    'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-l-[3px] px-3.5 py-3',
                                    cur
                                        ? 'border-accent/40 border-l-accent bg-accent-soft'
                                        : 'border-line border-l-line bg-surface'
                                )}>
                                <div className="grid min-w-0 gap-1">
                                    <span className="flex flex-wrap items-baseline gap-2">
                                        <Typography as="h3" weight="semibold">
                                            {planLabel(card.key, t)}
                                        </Typography>
                                        <span className="font-display text-lg font-semibold tracking-tight text-accent">
                                            {price}
                                        </span>
                                        {cents > 0 ? (
                                            <span className="font-mono text-[10px] text-fg-muted">
                                                {yearly
                                                    ? t(
                                                          'pages.settings.panels.plan.per_year_suffix'
                                                      )
                                                    : t(
                                                          'pages.settings.panels.plan.per_month_suffix'
                                                      )}
                                            </span>
                                        ) : null}
                                        <span className="rounded-full border border-line px-2 py-0.5 font-mono text-[8px] tracking-widest text-fg-secondary uppercase">
                                            {card.tag}
                                        </span>
                                        {cur && scheduledPlanKey && periodEndsAt ? (
                                            <span className="font-mono text-[10px] tracking-wide text-fg-muted uppercase">
                                                {t('pages.settings.panels.plan.scheduled_until', {
                                                    until: new Date(
                                                        periodEndsAt
                                                    ).toLocaleDateString(appLocale, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                    }),
                                                    next: planLabel(scheduledPlanKey, t),
                                                })}
                                            </span>
                                        ) : null}
                                    </span>
                                    <p className="line-clamp-2 text-xs leading-snug text-fg-muted">
                                        {card.line}
                                    </p>
                                    <span className="line-clamp-1 font-mono text-[10px] text-fg-faint">
                                        {card.feats}
                                    </span>
                                </div>
                                <Button
                                    variant={cur ? 'secondary' : 'primary'}
                                    size="sm"
                                    className="shrink-0 rounded-full font-mono text-[10px] tracking-widest uppercase"
                                    disabled={
                                        busy ||
                                        isDemoAccount ||
                                        cur ||
                                        (billingUnavailable &&
                                            PLAN_RANK[card.key] > PLAN_RANK[plan])
                                    }
                                    onClick={() => choosePlan(card.key)}>
                                    {cur
                                        ? t('pages.settings.panels.plan.status_current')
                                        : isDemoAccount
                                          ? t('pages.settings.panels.plan.status_locked')
                                          : billingUnavailable &&
                                              PLAN_RANK[card.key] > PLAN_RANK[plan]
                                            ? t('pages.settings.panels.plan.status_unavailable')
                                            : busy
                                              ? '…'
                                              : PLAN_RANK[card.key] < PLAN_RANK[plan]
                                                ? t('pages.settings.panels.plan.downgrade')
                                                : card.key === PlanKey.BASIC
                                                  ? t('pages.settings.panels.plan.choose_basic')
                                                  : t('pages.settings.panels.plan.upgrade')}
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </SettingsInkCard>

            {stripeLive && !isDemoAccount ? (
                <SettingsInkCard
                    eyebrow={t('pages.settings.panels.plan.payment_eyebrow')}
                    blurb={
                        hasActiveSubscription
                            ? t('pages.settings.panels.plan.payment_blurb_active')
                            : t('pages.settings.panels.plan.payment_blurb_inactive')
                    }>
                    <div className="flex flex-wrap items-center justify-between gap-3 py-2">
                        <p className="text-xs leading-snug text-fg-muted">
                            {hasActiveSubscription
                                ? t('pages.settings.panels.plan.portal_hint_active')
                                : t('pages.settings.panels.plan.portal_hint_inactive')}
                        </p>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="shrink-0 rounded-full font-mono text-[10px] tracking-widest uppercase"
                            disabled={busy}
                            onClick={() => openPortal.mutate()}>
                            {openPortal.isPending
                                ? '…'
                                : t('pages.settings.panels.plan.manage_billing')}
                        </Button>
                    </div>
                </SettingsInkCard>
            ) : null}

            <PlanChangeDialog
                open={pendingPlan !== null}
                diff={pendingDiff}
                busy={busy}
                stripeCheckout={pendingNeedsCheckout}
                periodEndDowngrade={pendingPeriodEndDowngrade}
                periodEndsAt={periodEndsAt}
                onOpenChange={open => {
                    if (!open) setPendingPlan(null);
                }}
                onConfirm={confirmPlanChange}
            />
            <StubNotice
                prefix={t('ui.statusPage.scaffold')}
                what={
                    isDemoAccount
                        ? t('pages.settings.panels.plan.stub_demo')
                        : PREVIEW_MODE || freePlanSwitch
                          ? t('pages.settings.panels.plan.stub_preview')
                          : billingUnavailable
                            ? t('pages.settings.panels.plan.stub_stripe')
                            : t('pages.settings.panels.plan.stub_billing')
                }
            />
        </SettingsPanel>
    );
}
