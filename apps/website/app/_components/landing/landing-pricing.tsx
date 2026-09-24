'use client';

import { useState } from 'react';

import { PLAN_LIMITS, PLAN_RANK, PlanKey } from '@rumtelo/contracts';
import { planIntentFromPlanKey, planIntentQuery } from '@rumtelo/utils';

import { Typography } from '@rumtelo/ui';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { PLANS } from '@/lib/landing-content';
import { planSlug } from '@/lib/landing-plans';
import { appHomeUrl, appPlanSettingsUrl, appSignInUrl, webSignUpPath } from '@/lib/portal-urls';
import { isRegistrationOpen } from '@/lib/maintenance';

import { Cta, SectionHeading } from './landing-primitives';
import { formatCatalogMajor, formatCatalogMajorExact } from './_utils/landing-money';

const PLAN_FEAT_KEYS = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6'] as const;

function planFeatureLines(
    tPlans: (key: string, values?: Record<string, string | number>) => string,
    key: PlanKey
): string[] {
    const slug = planSlug(key);
    const limits = PLAN_LIMITS[key];
    return PLAN_FEAT_KEYS.map(feat =>
        tPlans(`${slug}.${feat}`, {
            maxGoals: limits.maxGoals ?? 0,
            maxMembers: limits.maxMembers ?? 0,
        })
    );
}

function ctaForPlan(args: {
    planKey: PlanKey;
    planName: string;
    free: boolean;
    currentPlan: PlanKey | null;
    isAuthenticated: boolean;
    hasHousehold: boolean;
    t: (key: string, values?: Record<string, string | number>) => string;
}): { href: string; label: string; current: boolean } {
    const { planKey, planName, free, currentPlan, isAuthenticated, hasHousehold, t } = args;

    if (!isAuthenticated) {
        if (!isRegistrationOpen()) {
            return {
                href: appSignInUrl(),
                label: t('cta_sign_in'),
                current: false,
            };
        }
        return {
            href: webSignUpPath(
                planKey === PlanKey.BASIC
                    ? { plan: PlanKey.BASIC }
                    : planIntentQuery(planIntentFromPlanKey(planKey, 'month'))
            ),
            label: free ? t('cta_start_free') : t('cta_choose', { plan: planName }),
            current: false,
        };
    }

    if (!hasHousehold) {
        return {
            href: appHomeUrl(),
            label: t('cta_finish_setup'),
            current: false,
        };
    }

    if (currentPlan === planKey) {
        return {
            href: appPlanSettingsUrl(),
            label: t('cta_your_plan'),
            current: true,
        };
    }

    if (currentPlan && PLAN_RANK[planKey] > PLAN_RANK[currentPlan]) {
        return {
            href: appPlanSettingsUrl(),
            label: t('cta_upgrade_to', { plan: planName }),
            current: false,
        };
    }

    return {
        href: appPlanSettingsUrl(),
        label: t('cta_switch_to', { plan: planName }),
        current: false,
    };
}

export function LandingPricing() {
    const t = useTranslations('pages.landing.pricing_section');
    const tPlans = useTranslations('pages.landing.plans');
    const appLocale = useLocale();
    const [billing, setBilling] = useState<'month' | 'year'>('month');
    const yearly = billing === 'year';
    const {
        isAuthenticated,
        householdId,
        planKey: currentPlan,
        planPending,
    } = useMarketingSession();

    const lead = isAuthenticated
        ? currentPlan
            ? t('lead_on_plan', { plan: tPlans(`${planSlug(currentPlan)}.name`) })
            : planPending
              ? t('lead_loading')
              : householdId
                ? t('lead_manage')
                : t('lead_setup')
        : t('lead');

    return (
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                <SectionHeading
                    eyebrow={t('eyebrow')}
                    headline={isAuthenticated ? t('headline_auth') : t('headline')}
                    lead={lead}
                    headlineClassName="max-w-lg"
                    className="min-w-0"
                />

                {/* Billing toggle */}
                <div
                    role="tablist"
                    aria-label={t('billing_aria')}
                    className="flex w-full gap-1 rounded-full border border-line bg-raised p-1 sm:w-auto">
                    {(['month', 'year'] as const).map(period => {
                        const active = billing === period;
                        return (
                            <button
                                key={period}
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => setBilling(period)}
                                className={`flex-1 rounded-full px-3 py-2 font-mono text-xs font-semibold tracking-widest uppercase transition-colors sm:flex-none sm:px-4 ${
                                    active
                                        ? 'bg-(image:--gradient-accent) text-on-accent'
                                        : 'text-fg-muted hover:text-fg'
                                }`}>
                                {period === 'month' ? (
                                    t('interval_monthly')
                                ) : (
                                    <>
                                        <span className="sm:hidden">{t('interval_yearly')}</span>
                                        <span className="hidden sm:inline">
                                            {t('interval_yearly_full')}
                                        </span>
                                    </>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 items-start gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {PLANS.map(plan => {
                    const rec = plan.key === PlanKey.PLUS;
                    const free = plan.monthly === 0;
                    const price = free ? 0 : yearly ? plan.yearly : plan.monthly;
                    const per = free ? '' : yearly ? t('per_year_short') : t('per_month_short');
                    const sub = free
                        ? t('no_card')
                        : yearly
                          ? t('billed_yearly', {
                                amount: formatCatalogMajorExact(plan.yearly / 12, appLocale),
                            })
                          : t('cancel_any');
                    const slug = planSlug(plan.key);
                    const planName = tPlans(`${slug}.name`);
                    const action = ctaForPlan({
                        planKey: plan.key,
                        planName,
                        free,
                        currentPlan,
                        isAuthenticated,
                        hasHousehold: Boolean(householdId),
                        t,
                    });
                    const feats = planFeatureLines(tPlans, plan.key);
                    // Guest CTAs still respect the billing toggle for paid plans.
                    const href =
                        !isAuthenticated && plan.key !== PlanKey.BASIC && isRegistrationOpen()
                            ? webSignUpPath(
                                  planIntentQuery(planIntentFromPlanKey(plan.key, billing))
                              )
                            : action.href;
                    const isCurrent = action.current;

                    return (
                        <div
                            key={plan.key}
                            className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-surface shadow-md ring-1 ring-fg/6 ring-inset dark:ring-white/6 ${
                                isCurrent
                                    ? 'border-accent/50 shadow-glow'
                                    : rec
                                      ? 'border-accent/40 shadow-glow'
                                      : 'border-line'
                            }`}>
                            <span
                                className={`block h-1 ${
                                    isCurrent || rec
                                        ? 'bg-(image:--gradient-accent)'
                                        : 'bg-transparent'
                                }`}
                            />

                            <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 pt-6">
                                <Typography as="h2">{planName}</Typography>
                                <span
                                    className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap uppercase ${
                                        isCurrent || rec
                                            ? 'border-transparent bg-(image:--gradient-accent) text-on-accent'
                                            : 'border-line text-fg-faint'
                                    }`}>
                                    {isCurrent ? t('your_plan') : tPlans(`${slug}.tag`)}
                                </span>
                            </div>

                            <div className="px-6 pt-4">
                                <span className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="font-display text-4xl leading-none font-semibold tracking-tight text-accent">
                                        {formatCatalogMajor(price, appLocale)}
                                    </span>
                                    <span className="font-mono text-xs font-medium text-fg-faint">
                                        {per}
                                    </span>
                                </span>
                                <span className="mt-2 block font-mono text-xs font-medium tracking-wide text-fg-faint">
                                    {sub}
                                </span>
                            </div>

                            <Typography
                                as="p"
                                size="sm"
                                color="secondary"
                                className="mx-6 my-4 text-pretty">
                                {tPlans(`${slug}.line`)}
                            </Typography>

                            <ul className="mx-0 mb-5 grid gap-2 border-t border-line px-6 pt-4">
                                {feats.map(feature => (
                                    <li key={feature} className="flex min-w-0 items-baseline gap-2">
                                        <span
                                            className="shrink-0 font-mono text-xs text-accent"
                                            aria-hidden>
                                            ✦
                                        </span>
                                        <span className="text-sm leading-normal text-fg-secondary">
                                            {feature}
                                        </span>
                                    </li>
                                ))}
                            </ul>

                            <Cta
                                href={href}
                                variant={isCurrent || rec ? 'primary' : 'ghost'}
                                size="lg"
                                className={`mx-6 mt-auto mb-6 ${isCurrent || rec ? '' : 'text-fg-strong'}`}>
                                {action.label}
                            </Cta>
                        </div>
                    );
                })}
            </div>

            <p className="mt-5 text-center font-mono text-xs font-medium tracking-wide text-fg-faint">
                {t('footnote')}
            </p>
        </section>
    );
}
