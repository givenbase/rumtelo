'use client';

import { useEffect, useState } from 'react';

import {
    PLAN_LIMITS,
    PLAN_RANK,
    PLAN_RETAIL_CENTS,
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_DISCOUNT_PCT,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
    PlanKey,
} from '@rumtelo/contracts';
import {
    cn,
    DEFAULT_SIGN_UP_AUDIENCE,
    formatPlanPrice,
    planIntentFromPlanKey,
    planIntentQuery,
    SIGN_UP_AUDIENCES,
    signUpAudienceQuery,
    type SignUpAudience,
} from '@rumtelo/utils';

import { Icon, Typography } from '@rumtelo/ui';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { useLocale, useTranslations } from '@rumtelo/i18n';

import { PLANS, PORTALS } from '@/lib/landing-content';
import { livePlanFeatureKeys, planProductCoverage, planSlug } from '@/lib/landing-plans';
import {
    appHomeUrl,
    appPlanSettingsUrl,
    appPracticeUrl,
    appSignInUrl,
    webSignUpPath,
} from '@/lib/portal-urls';
import { isLaunchProductsDeferred } from '@/lib/launch-products';
import { isRegistrationOpen } from '@/lib/maintenance';

import { CARD, Cta, SectionHeading } from './landing-primitives';
import { formatCatalogMajor, formatCatalogMajorExact } from './_utils/landing-money';

const PRACTICE_FEAT_KEYS = ['f1', 'f2', 'f3', 'f4'] as const;
const PRACTICE_STEP_KEYS = ['step_1', 'step_2', 'step_3'] as const;
/** Worked example under the seat prices — a solo coach with this many sponsored clients. */
const PRACTICE_EXAMPLE_CLIENTS = 10;

/** `#practices` (header nav, sales links) opens the table on the Practice tab. */
const PRACTICES_HASH = '#practices';

const AUDIENCE_LABEL_KEY: Record<SignUpAudience, string> = {
    individual: 'audience_individual',
    practice: 'audience_practice',
};

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
    const [audience, setAudience] = useState<SignUpAudience>(DEFAULT_SIGN_UP_AUDIENCE);
    const [billing, setBilling] = useState<'month' | 'year'>('month');
    const forPractice = audience === 'practice';
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

    useEffect(() => {
        const openFromHash = () => {
            if (window.location.hash === PRACTICES_HASH) setAudience('practice');
        };
        openFromHash();
        window.addEventListener('hashchange', openFromHash);
        return () => window.removeEventListener('hashchange', openFromHash);
    }, []);

    return (
        <section id="pricing" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <span id="practices" aria-hidden className="block scroll-mt-24" />

            {/* Audience switch — who is signing up decides the table below */}
            <div
                role="tablist"
                aria-label={t('audience_aria')}
                className="mb-8 flex w-full gap-1 rounded-full border border-line bg-raised p-1 sm:w-fit">
                {SIGN_UP_AUDIENCES.map(option => {
                    const active = audience === option;
                    return (
                        <button
                            key={option}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setAudience(option)}
                            className={cn(
                                'flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:flex-none sm:px-5',
                                active
                                    ? 'bg-(image:--gradient-accent) text-on-accent'
                                    : 'text-fg-muted hover:text-fg'
                            )}>
                            {t(AUDIENCE_LABEL_KEY[option])}
                        </button>
                    );
                })}
            </div>

            {forPractice ? (
                <PracticePricing />
            ) : (
                <HouseholdPricing lead={lead} billing={billing} onBillingChange={setBilling} />
            )}
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
        meterOn: string;
        meterOff: string;
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
        meterOn: 'bg-accent',
        meterOff: 'bg-sunken',
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
        meterOn: 'bg-accent',
        meterOff: 'bg-sunken',
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
        meterOn: 'bg-accent-hover',
        meterOff: 'bg-sunken',
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
    const coverage = planProductCoverage(planKey);
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
                    {coverage.map(({ product, included, total }) => {
                        const portal = PORTAL_BY_PRODUCT[product];
                        const none = included === 0;
                        const full = included === total;
                        return (
                            <li key={product} className="flex min-w-0 items-center gap-3">
                                <span
                                    className={cn(
                                        'grid size-8 shrink-0 place-items-center rounded-lg border',
                                        tone.iconWrap,
                                        none && 'opacity-50'
                                    )}>
                                    {portal ? (
                                        <Icon
                                            name={portal.icon}
                                            size="sm"
                                            style={{ color: portal.colorVar }}
                                        />
                                    ) : null}
                                </span>
                                <span className="grid min-w-0 flex-1 gap-1.5">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span
                                            className={cn(
                                                'text-sm font-semibold',
                                                tone.name,
                                                none && 'opacity-60'
                                            )}>
                                            {tPortals(`${product}.name`)}
                                        </span>
                                        <span
                                            className={cn(
                                                'flex shrink-0 items-center gap-1 font-mono text-xs font-semibold',
                                                full ? tone.mark : tone.meta
                                            )}>
                                            {none ? (
                                                <>
                                                    <Icon name="x" size="sm" color="inherit" />
                                                    {t('product_none')}
                                                </>
                                            ) : (
                                                <>
                                                    {full ? (
                                                        <Icon
                                                            name="check"
                                                            size="sm"
                                                            color="inherit"
                                                        />
                                                    ) : null}
                                                    {t('feature_count', { included, total })}
                                                </>
                                            )}
                                        </span>
                                    </span>
                                    <span className="flex gap-1" aria-hidden>
                                        {Array.from({ length: total }, (_, index) => (
                                            <span
                                                key={index}
                                                className={cn(
                                                    'h-1 flex-1 rounded-full',
                                                    index < included ? tone.meterOn : tone.meterOff
                                                )}
                                            />
                                        ))}
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

function PracticePricing() {
    const t = useTranslations('pages.landing.pricing_section');
    const tPractice = useTranslations('pages.landing.practice_plan');
    const appLocale = useLocale();
    const { isAuthenticated } = useMarketingSession();
    const price = (cents: number) => formatPlanPrice(cents, { locale: appLocale });

    const action = isAuthenticated
        ? { href: appPracticeUrl(), label: tPractice('cta_open') }
        : isRegistrationOpen()
          ? { href: webSignUpPath(signUpAudienceQuery('practice')), label: tPractice('cta') }
          : { href: appSignInUrl(), label: t('cta_sign_in') };

    const extras = [
        {
            key: 'staff',
            label: tPractice('extra_staff'),
            value: tPractice('per_month_each', { price: price(PRACTICE_STAFF_SEAT_UNIT_CENTS) }),
            hint: tPractice('extra_staff_hint'),
        },
        {
            key: 'view',
            label: tPractice('extra_view'),
            value: tPractice('extra_view_price'),
            hint: tPractice('extra_view_hint'),
        },
        {
            key: 'manage',
            label: tPractice('extra_manage'),
            value: tPractice('per_month_each', { price: price(PRACTICE_CLIENT_SEAT_UNIT_CENTS) }),
            hint: tPractice('extra_manage_hint', {
                discount: PRACTICE_CLIENT_DISCOUNT_PCT,
                retail: price(PLAN_RETAIL_CENTS[PlanKey.PLUS].month),
            }),
        },
    ];
    // You (one staff seat) + the base + N sponsored clients.
    const exampleTotal =
        PRACTICE_BASE_UNIT_CENTS +
        PRACTICE_STAFF_SEAT_UNIT_CENTS +
        PRACTICE_EXAMPLE_CLIENTS * PRACTICE_CLIENT_SEAT_UNIT_CENTS;

    return (
        <>
            <SectionHeading
                eyebrow={t('eyebrow')}
                headline={t('headline_practice')}
                lead={t('lead_practice')}
                headlineClassName="max-w-lg"
                className="mb-8 min-w-0"
            />

            <div className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
                <div
                    className={cn(
                        CARD,
                        'flex min-w-0 flex-col overflow-hidden border-accent/40 shadow-glow'
                    )}>
                    <span className="block h-1 bg-(image:--gradient-accent)" />

                    <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 pt-6">
                        <Typography as="h2">{tPractice('name')}</Typography>
                        <span className="rounded-full border border-transparent bg-(image:--gradient-accent) px-3 py-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-on-accent uppercase">
                            {tPractice('tag')}
                        </span>
                    </div>

                    <div className="px-6 pt-4">
                        <span className="flex flex-wrap items-baseline gap-1.5">
                            <span className="font-display text-4xl leading-none font-semibold tracking-tight text-accent">
                                {price(PRACTICE_BASE_UNIT_CENTS)}
                            </span>
                            <span className="font-mono text-xs font-medium text-fg-faint">
                                {t('per_month_short')}
                            </span>
                        </span>
                        <span className="mt-2 block font-mono text-xs font-medium tracking-wide text-fg-faint">
                            {tPractice('sub')}
                        </span>
                    </div>

                    <Typography
                        as="p"
                        size="sm"
                        color="secondary"
                        className="mx-6 my-4 text-pretty">
                        {tPractice('line')}
                    </Typography>

                    <ul className="mb-5 grid gap-2 border-t border-line px-6 pt-4">
                        {PRACTICE_FEAT_KEYS.map(key => (
                            <li key={key} className="flex min-w-0 items-baseline gap-2">
                                <span
                                    className="shrink-0 font-mono text-xs text-accent"
                                    aria-hidden>
                                    ✦
                                </span>
                                <span className="text-sm leading-normal text-fg-secondary">
                                    {tPractice(key)}
                                </span>
                            </li>
                        ))}
                    </ul>

                    <div className="mx-6 mb-5 rounded-xl border border-line bg-raised px-4 py-4">
                        <p className="font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                            {tPractice('extras_title')}
                        </p>
                        <dl className="mt-3 grid gap-3.5">
                            {extras.map(extra => (
                                <div
                                    key={extra.key}
                                    className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5">
                                    <dt className="min-w-0 text-sm font-semibold text-fg">
                                        {extra.label}
                                    </dt>
                                    <dd className="text-right text-sm font-semibold whitespace-nowrap text-accent">
                                        {extra.value}
                                    </dd>
                                    <dd className="col-span-2 text-xs leading-relaxed text-fg-muted">
                                        {extra.hint}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                        <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-fg-secondary">
                            {tPractice('example', {
                                clients: PRACTICE_EXAMPLE_CLIENTS,
                                total: price(exampleTotal),
                            })}
                        </p>
                    </div>

                    <Cta
                        href={action.href}
                        variant="primary"
                        size="lg"
                        className="mx-6 mt-auto mb-6">
                        {action.label}
                    </Cta>
                </div>

                <div className={cn(CARD, 'min-w-0 px-6 py-6')}>
                    <Typography as="h3">{tPractice('steps_title')}</Typography>
                    <ol className="mt-4 grid gap-4">
                        {PRACTICE_STEP_KEYS.map((key, index) => (
                            <li key={key} className="flex min-w-0 items-start gap-3">
                                <span
                                    aria-hidden
                                    className="grid size-7 shrink-0 place-items-center rounded-full border border-accent/30 bg-accent-soft font-mono text-xs font-semibold text-accent">
                                    {index + 1}
                                </span>
                                <span className="pt-0.5 text-sm leading-normal text-fg-secondary">
                                    {tPractice(key)}
                                </span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            <p className="mt-5 text-center font-mono text-xs font-medium tracking-wide text-fg-faint">
                {tPractice('footnote')}
            </p>
        </>
    );
}
