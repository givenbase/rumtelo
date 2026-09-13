'use client';

import { useState } from 'react';

import { PLAN_RANK, PlanKey } from '@rumtelo/contracts';
import { planIntentFromPlanKey, planIntentQuery } from '@rumtelo/utils';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { PLANS, PRICING_SECTION } from '@/lib/landing-content';
import { appHomeUrl, appPlanSettingsUrl, webSignUpPath } from '@/lib/portal-urls';

import { Cta, SectionHeading } from './landing-primitives';
import { formatCatalogMajor, formatCatalogMajorExact } from './landing-money';

const PLAN_NAMES = { BASIC: 'Basic', PLUS: 'Plus', MAX: 'Max' } as const;

function ctaForPlan(args: {
    planKey: PlanKey;
    planName: string;
    free: boolean;
    currentPlan: PlanKey | null;
    isAuthenticated: boolean;
    hasHousehold: boolean;
}): { href: string; label: string; current: boolean } {
    const { planKey, planName, free, currentPlan, isAuthenticated, hasHousehold } = args;

    if (!isAuthenticated) {
        return {
            href: webSignUpPath(
                planKey === PlanKey.BASIC
                    ? { plan: PlanKey.BASIC }
                    : planIntentQuery(planIntentFromPlanKey(planKey, 'month'))
            ),
            label: free ? 'Start free' : `Choose ${planName} · pay after setup`,
            current: false,
        };
    }

    if (!hasHousehold) {
        return {
            href: appHomeUrl(),
            label: 'Finish setup in the app',
            current: false,
        };
    }

    if (currentPlan === planKey) {
        return {
            href: appPlanSettingsUrl(),
            label: 'Your plan · manage',
            current: true,
        };
    }

    if (currentPlan && PLAN_RANK[planKey] > PLAN_RANK[currentPlan]) {
        return {
            href: appPlanSettingsUrl(),
            label: `Upgrade to ${planName}`,
            current: false,
        };
    }

    return {
        href: appPlanSettingsUrl(),
        label: `Switch to ${planName}`,
        current: false,
    };
}

export function LandingPricing() {
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
            ? `You’re on ${PLAN_NAMES[currentPlan]}. Upgrade, switch or manage billing in the app — changes apply to your household.`
            : planPending
              ? 'Loading your plan…'
              : householdId
                ? 'Open Plan & billing in the app to upgrade or change your package.'
                : 'Finish household setup in the app, then you can upgrade or change your plan here.'
        : PRICING_SECTION.lead;

    return (
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
                <SectionHeading
                    eyebrow={PRICING_SECTION.eyebrow}
                    headline={
                        isAuthenticated
                            ? 'Your plan and what you can change'
                            : PRICING_SECTION.headline
                    }
                    lead={lead}
                    headlineClassName="max-w-lg"
                    className="min-w-0"
                />

                {/* Billing toggle */}
                <div
                    role="tablist"
                    aria-label="Billing period"
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
                                    'Monthly'
                                ) : (
                                    <>
                                        <span className="sm:hidden">Yearly</span>
                                        <span className="hidden sm:inline">
                                            Yearly · 2 months free
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
                    const per = free ? '' : yearly ? '/year' : '/month';
                    const sub = free
                        ? 'no card needed'
                        : yearly
                          ? `${formatCatalogMajorExact(plan.yearly / 12)}/month billed yearly`
                          : 'cancel any month';
                    const action = ctaForPlan({
                        planKey: plan.key,
                        planName: plan.name,
                        free,
                        currentPlan,
                        isAuthenticated,
                        hasHousehold: Boolean(householdId),
                    });
                    // Guest CTAs still respect the billing toggle for paid plans.
                    const href =
                        !isAuthenticated && plan.key !== PlanKey.BASIC
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
                                <span className="font-display text-2xl font-semibold tracking-tight text-fg">
                                    {plan.name}
                                </span>
                                <span
                                    className={`rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap uppercase ${
                                        isCurrent || rec
                                            ? 'border-transparent bg-(image:--gradient-accent) text-on-accent'
                                            : 'border-line text-fg-faint'
                                    }`}>
                                    {isCurrent ? 'Your plan' : plan.tag}
                                </span>
                            </div>

                            <div className="px-6 pt-4">
                                <span className="flex flex-wrap items-baseline gap-1.5">
                                    <span className="font-display text-4xl leading-none font-semibold tracking-tight text-accent">
                                        {formatCatalogMajor(price)}
                                    </span>
                                    <span className="font-mono text-xs font-medium text-fg-faint">
                                        {per}
                                    </span>
                                </span>
                                <span className="mt-2 block font-mono text-xs font-medium tracking-wide text-fg-faint">
                                    {sub}
                                </span>
                            </div>

                            <p className="mx-6 my-4 text-sm leading-relaxed text-pretty text-fg-secondary">
                                {plan.line}
                            </p>

                            <ul className="mx-0 mb-5 grid gap-2 border-t border-line px-6 pt-4">
                                {plan.feats.map(feature => (
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
                Prices in euro, VAT included. Basic may stay free or become a small fee later —
                nothing you enter is ever locked away.
            </p>
        </section>
    );
}
