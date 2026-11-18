'use client';

import { useState } from 'react';
import Link from 'next/link';

import { PLAN_LIMITS, PLAN_RANK, PlanKey } from '@rumtelo/contracts';
import { cn, planIntentFromPlanKey, planIntentQuery } from '@rumtelo/utils';

import { Icon, Typography } from '@rumtelo/ui';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { PLANS, PORTALS } from '@/lib/landing-content';
import { livePlanFeatureKeys, livePlanProducts, planSlug } from '@/lib/landing-plans';
import { appHomeUrl, appPlanSettingsUrl, appSignInUrl, webSignUpPath } from '@/lib/portal-urls';
import { isLaunchProductsDeferred } from '@/lib/launch-products';
import { isRegistrationOpen } from '@/lib/maintenance';

import { Cta, SectionHeading } from './landing-primitives';
import { formatCatalogMajor, formatCatalogMajorExact } from './_utils/landing-money';

function planFeatureLines(
    tPlans: (key: string, values?: Record<string, string | number>) => string,
    key: PlanKey
): string[] {
    const slug = planSlug(key);
    const limits = PLAN_LIMITS[key];
    return livePlanFeatureKeys(key).map(feat =>
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
    const [billing, setBilling] = useState<'month' | 'year'>('month');
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
        <section id="pricing" className="border-y border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <HouseholdPricing lead={lead} billing={billing} onBillingChange={setBilling} />
            </div>
        </section>
    );
}

function HouseholdPricing({
    lead,
    billing,
    onBillingChange,
}: {
    lead: string;
    billing: 'month' | 'year';
    onBillingChange: (next: 'month' | 'year') => void;
}) {
    const t = useTranslations('pages.landing.pricing_section');
    const tPlans = useTranslations('pages.landing.plans');
    const appLocale = useLocale();
    const yearly = billing === 'year';
    const { isAuthenticated, householdId, planKey: currentPlan } = useMarketingSession();

    return (
        <>
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
                                onClick={() => onBillingChange(period)}
                                className={cn(
                                    'flex-1 rounded-full px-3 py-2 font-mono text-xs font-semibold tracking-widest uppercase transition-colors sm:flex-none sm:px-4',
                                    active
                                        ? 'bg-(image:--gradient-accent) text-on-accent'
                                        : 'text-fg-muted hover:text-fg'
                                )}>
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

            <div className="grid grid-cols-1 items-stretch gap-3.5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
                {PLANS.map(plan => {
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
                    // Guest CTAs still respect the billing toggle for paid plans.
                    const href =
                        !isAuthenticated && plan.key !== PlanKey.BASIC && isRegistrationOpen()
                            ? webSignUpPath(
                                  planIntentQuery(planIntentFromPlanKey(plan.key, billing))
                              )
                            : action.href;

                    return (
                        <PlanCard
                            key={plan.key}
                            planKey={plan.key}
                            planName={planName}
                            price={formatCatalogMajor(price, appLocale)}
                            per={per}
                            sub={sub}
                            href={href}
                            ctaLabel={action.label}
                            isCurrent={action.current}
                            features={planFeatureLines(tPlans, plan.key)}
                        />
                    );
                })}
            </div>

            <p className="mt-5 text-center font-mono text-xs font-medium tracking-wide text-fg-faint">
                {t('footnote')}
            </p>
            <p className="mt-3 text-center text-sm">
                <Link
                    href="/practices"
                    className="inline-flex min-h-11 items-center gap-1.5 text-accent hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
                    {t('practice_link')}
                    <span aria-hidden>→</span>
                </Link>
            </p>
        </>
    );
}

type PlanTone = 'plain' | 'featured' | 'premium';

/** Basic stays quiet, Plus is the recommendation, Max is the premium tier. */
const PLAN_TONE: Record<PlanKey, PlanTone> = {
    [PlanKey.BASIC]: 'plain',
    [PlanKey.PLUS]: 'featured',
    [PlanKey.MAX]: 'premium',
};

const TONE_CLASSES: Record<
    PlanTone,
    {
        card: string;
        bar: string;
        name: string;
        price: string;
        meta: string;
        body: string;
        divider: string;
        tag: string;
        mark: string;
        iconWrap: string;
    }
> = {
    plain: {
        card: 'border-line bg-surface shadow-md',
        bar: 'bg-transparent',
        name: 'text-fg',
        price: 'text-fg',
        meta: 'text-fg-faint',
        body: 'text-fg-secondary',
        divider: 'border-line',
        tag: 'border-line text-fg-faint',
        mark: 'text-accent',
        iconWrap: 'border-line bg-raised',
    },
    featured: {
        card: 'border-accent/50 bg-surface shadow-glow lg:-translate-y-3',
        bar: 'bg-(image:--gradient-accent)',
        name: 'text-fg',
        price: 'text-accent',
        meta: 'text-fg-faint',
        body: 'text-fg-secondary',
        divider: 'border-line',
        tag: 'border-transparent bg-(image:--gradient-accent) text-on-accent',
        mark: 'text-accent',
        iconWrap: 'border-line bg-raised',
    },
    // Rendered inside `data-theme="dark"`, so these tokens resolve to the dark palette in both themes.
    premium: {
        card: 'border-accent/45 bg-bg-app bg-[radial-gradient(90%_55%_at_100%_0%,rgb(46_174_170/0.24),transparent_70%)] shadow-glow',
        bar: 'bg-(image:--gradient-accent)',
        name: 'text-fg',
        price: 'text-accent-hover',
        meta: 'text-fg-muted',
        body: 'text-fg-secondary',
        divider: 'border-line',
        tag: 'border-accent/50 text-accent-hover',
        mark: 'text-accent-hover',
        iconWrap: 'border-line bg-raised',
    },
};

const PORTAL_BY_PRODUCT = Object.fromEntries(PORTALS.map(portal => [portal.key, portal]));

function PlanCard({
    planKey,
    planName,
    price,
    per,
    sub,
    href,
    ctaLabel,
    isCurrent,
    features,
}: {
    planKey: PlanKey;
    planName: string;
    price: string;
    per: string;
    sub: string;
    href: string;
    ctaLabel: string;
    isCurrent: boolean;
    features: string[];
}) {
    const t = useTranslations('pages.landing.pricing_section');
    const tPlans = useTranslations('pages.landing.plans');
    const tPortals = useTranslations('pages.landing.portals');
    const slug = planSlug(planKey);
    const tone = TONE_CLASSES[PLAN_TONE[planKey]];
    const products = livePlanProducts();
    const premium = PLAN_TONE[planKey] === 'premium';

    return (
        <article
            data-theme={premium ? 'dark' : undefined}
            className={cn(
                'relative flex min-w-0 flex-col overflow-hidden rounded-2xl border ring-1 ring-fg/6 transition-transform ring-inset dark:ring-white/6',
                tone.card
            )}>
            <span className={cn('block h-1', tone.bar)} />

            <div className="px-6 pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <Typography as="h2" className={tone.name}>
                        {planName}
                    </Typography>
                    <span
                        className={cn(
                            'rounded-full border px-3 py-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap uppercase',
                            tone.tag
                        )}>
                        {isCurrent ? t('your_plan') : tPlans(`${slug}.tag`)}
                    </span>
                </div>
                <p
                    className={cn(
                        'mt-2 font-mono text-[11px] font-semibold tracking-widest uppercase',
                        tone.meta
                    )}>
                    {tPlans(`${slug}.best_for`)}
                </p>
            </div>

            <div className="px-6 pt-5">
                <span className="flex flex-wrap items-baseline gap-1.5">
                    <span
                        className={cn(
                            'font-display text-5xl leading-none font-semibold tracking-tight',
                            tone.price
                        )}>
                        {price}
                    </span>
                    <span className={cn('font-mono text-xs font-medium', tone.meta)}>{per}</span>
                </span>
                <span
                    className={cn(
                        'mt-2 block font-mono text-xs font-medium tracking-wide',
                        tone.meta
                    )}>
                    {sub}
                </span>
            </div>

            <p
                className={cn(
                    'mx-6 mt-4 text-sm leading-relaxed text-pretty lg:min-h-18',
                    tone.body
                )}>
                {tPlans(`${slug}.line`)}
            </p>

            <Cta
                href={href}
                variant={PLAN_TONE[planKey] === 'plain' || isCurrent ? 'ghost' : 'primary'}
                size="lg"
                className="mx-6 mt-5 mb-6">
                {ctaLabel}
            </Cta>

            <div className={cn('border-t px-6 py-5', tone.divider)}>
                <p
                    className={cn(
                        'font-mono text-[10px] font-semibold tracking-widest uppercase',
                        tone.meta
                    )}>
                    {t('products_title')}
                </p>
                <ul className="mt-3 grid gap-3">
                    {products.map(product => {
                        const portal = PORTAL_BY_PRODUCT[product];
                        return (
                            <li key={product} className="flex min-w-0 items-center gap-3">
                                <span
                                    className={cn(
                                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                                        tone.iconWrap
                                    )}>
                                    {portal ? (
                                        <Icon
                                            name={portal.icon}
                                            size="sm"
                                            style={{ color: portal.colorVar }}
                                        />
                                    ) : null}
                                </span>
                                <span className="grid min-w-0 flex-1 gap-0.5">
                                    <span className={cn('text-sm font-semibold', tone.name)}>
                                        {tPortals(`${product}.name`)}
                                    </span>
                                    <span className={cn('text-xs leading-snug', tone.body)}>
                                        {tPlans(`${slug}.outcome.${product}`, {
                                            maxGoals: PLAN_LIMITS[planKey].maxGoals ?? 0,
                                        })}
                                    </span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
                {isLaunchProductsDeferred() ? (
                    <p className={cn('mt-3 font-mono text-[11px] tracking-wide', tone.meta)}>
                        + {t('products_more')}
                    </p>
                ) : null}
            </div>

            <div className={cn('mt-auto border-t px-6 pt-5 pb-6', tone.divider)}>
                <p
                    className={cn(
                        'font-mono text-[10px] font-semibold tracking-widest uppercase',
                        tone.meta
                    )}>
                    {t('features_title')}
                </p>
                <ul className="mt-3 grid gap-2">
                    {features.map(feature => (
                        <li key={feature} className="flex min-w-0 items-start gap-2">
                            <span className={cn('mt-0.5 shrink-0', tone.mark)} aria-hidden>
                                <Icon name="check" size="sm" color="inherit" />
                            </span>
                            <span className={cn('text-sm leading-normal', tone.body)}>
                                {feature}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </article>
    );
}
