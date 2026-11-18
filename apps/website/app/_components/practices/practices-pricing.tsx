'use client';

import {
    PLAN_RETAIL_CENTS,
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_DISCOUNT_PCT,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
    PlanKey,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, formatPlanPrice } from '@rumtelo/utils';

import { CARD, SectionHeading } from '@/components/landing/landing-primitives';

import { PracticeCta } from './practice-cta';

/** Worked example: a solo coach whose clients look along (free), then the sponsor case. */
const EXAMPLE_CLIENTS = 10;
const EXAMPLE_SPONSORED = 3;

export function PracticesPricing() {
    const t = useTranslations('pages.practices.pricing');
    const tPlan = useTranslations('pages.landing.practice_plan');
    const tPricing = useTranslations('pages.landing.pricing_section');
    const locale = useLocale();
    const price = (cents: number) => formatPlanPrice(cents, { locale });

    const extras = [
        {
            key: 'staff',
            label: tPlan('extra_staff'),
            value: tPlan('per_month_each', { price: price(PRACTICE_STAFF_SEAT_UNIT_CENTS) }),
            hint: tPlan('extra_staff_hint'),
        },
        {
            key: 'view',
            label: tPlan('extra_view'),
            value: tPlan('extra_view_price'),
            hint: tPlan('extra_view_hint'),
        },
        {
            key: 'manage',
            label: tPlan('extra_manage'),
            value: tPlan('per_month_each', { price: price(PRACTICE_CLIENT_SEAT_UNIT_CENTS) }),
            hint: tPlan('extra_manage_hint', {
                discount: PRACTICE_CLIENT_DISCOUNT_PCT,
                retail: price(PLAN_RETAIL_CENTS[PlanKey.PLUS].month),
            }),
        },
    ];
    // Base + the owner as the first staff seat; look-along clients are free.
    const exampleTotal = PRACTICE_BASE_UNIT_CENTS + PRACTICE_STAFF_SEAT_UNIT_CENTS;
    const sponsorExtra = EXAMPLE_SPONSORED * PRACTICE_CLIENT_SEAT_UNIT_CENTS;

    return (
        <section
            id="pricing"
            className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 lg:px-6 lg:py-20">
            <SectionHeading
                eyebrow={t('eyebrow')}
                headline={t('headline')}
                lead={t('lead')}
                headlineClassName="max-w-lg"
                className="mb-8 min-w-0"
            />

            <div
                className={cn(
                    CARD,
                    'mx-auto flex max-w-2xl min-w-0 flex-col overflow-hidden border-accent/40 shadow-glow'
                )}>
                <span className="block h-1 bg-(image:--gradient-accent)" />

                <div className="flex flex-wrap items-center justify-between gap-2.5 px-6 pt-6">
                    <Typography as="h3">{tPlan('name')}</Typography>
                    <span className="rounded-full border border-transparent bg-(image:--gradient-accent) px-3 py-1 font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-on-accent uppercase">
                        {tPlan('tag')}
                    </span>
                </div>

                <div className="px-6 pt-4">
                    <span className="flex flex-wrap items-baseline gap-1.5">
                        <span className="font-display text-4xl leading-none font-semibold tracking-tight text-accent">
                            {price(PRACTICE_BASE_UNIT_CENTS)}
                        </span>
                        <span className="font-mono text-xs font-medium text-fg-faint">
                            {tPricing('per_month_short')}
                        </span>
                    </span>
                    <span className="mt-2 block font-mono text-xs font-medium tracking-wide text-fg-faint">
                        {tPlan('sub')}
                    </span>
                </div>

                <Typography as="p" size="sm" color="secondary" className="mx-6 my-4 text-pretty">
                    {tPlan('line')}
                </Typography>

                <div className="mx-6 mb-5 rounded-xl border border-line bg-raised px-4 py-4">
                    <p className="font-mono text-[10px] font-semibold tracking-widest text-fg-faint uppercase">
                        {tPlan('extras_title')}
                    </p>
                    <dl className="mt-3 grid gap-3.5">
                        {extras.map(extra => (
                            <div
                                key={extra.key}
                                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5">
                                <dt className="min-w-0 text-sm font-semibold text-fg">
                                    {extra.label}
                                </dt>
                                <dd className="text-right text-sm font-semibold text-accent">
                                    {extra.value}
                                </dd>
                                <dd className="col-span-2 text-xs leading-relaxed text-fg-muted">
                                    {extra.hint}
                                </dd>
                            </div>
                        ))}
                    </dl>
                    <div className="mt-4 grid gap-1 border-t border-line pt-3 text-xs leading-relaxed text-fg-secondary">
                        <p>
                            {t('example', {
                                clients: EXAMPLE_CLIENTS,
                                total: price(exampleTotal),
                            })}
                        </p>
                        <p>
                            {t('example_sponsor', {
                                sponsored: EXAMPLE_SPONSORED,
                                amount: price(sponsorExtra),
                            })}
                        </p>
                    </div>
                </div>

                <PracticeCta className="mx-6 mb-5 sm:w-auto" />

                <p className="border-t border-line px-6 py-4 text-center font-mono text-xs font-medium tracking-wide text-fg-faint">
                    {tPlan('footnote')}
                </p>
            </div>
        </section>
    );
}
