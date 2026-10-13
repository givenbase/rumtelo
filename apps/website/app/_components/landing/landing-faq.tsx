'use client';

import {
    PLAN_LIMITS,
    PRACTICE_BASE_UNIT_CENTS,
    PRACTICE_CLIENT_SEAT_UNIT_CENTS,
    PRACTICE_STAFF_SEAT_UNIT_CENTS,
    PlanKey,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, formatPlanPrice } from '@rumtelo/utils';

import { isProductLive } from '@/lib/launch-products';

import { CARD, SectionHeading } from './landing-primitives';

const FAQ_KEYS = [
    'budgeting',
    'bank',
    'sleep',
    'coach',
    'partner',
    'practice',
    'data',
    'language',
] as const;

/** Questions that only make sense while their product is live. */
const FAQ_PRODUCT: Partial<Record<(typeof FAQ_KEYS)[number], string>> = { sleep: 'energy' };

const LIVE_FAQ_KEYS = FAQ_KEYS.filter(key => {
    const product = FAQ_PRODUCT[key];
    return !product || isProductLive(product);
});

/** Native <details> — no client JS, keyboard-accessible, indexable. */
export function LandingFaq() {
    const t = useTranslations('pages.landing');
    const locale = useLocale();
    const price = (cents: number) => formatPlanPrice(cents, { locale });

    return (
        <section id="faq" className="border-t border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
                    <SectionHeading
                        eyebrow={t('faq_section.eyebrow')}
                        headline={t('faq_section.headline')}
                        lead={t('faq_section.lead')}
                    />

                    <div className="grid gap-2.5">
                        {LIVE_FAQ_KEYS.map((key, index) => (
                            <details
                                key={key}
                                open={index === 0}
                                className={cn(CARD, 'group open:border-accent/35')}>
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                                    <Typography as="h4" size="lg">
                                        {t(`faq.${key}.question`)}
                                    </Typography>
                                    <span
                                        className="grid size-7 shrink-0 place-items-center rounded-full border border-line font-mono text-sm text-fg-muted transition-transform group-open:rotate-45 group-open:border-accent group-open:text-accent"
                                        aria-hidden>
                                        +
                                    </span>
                                </summary>
                                <Typography
                                    as="p"
                                    size="sm"
                                    color="muted"
                                    className="border-t border-line px-5 py-4 text-pretty">
                                    {t(`faq.${key}.answer`, {
                                        maxMembers: PLAN_LIMITS[PlanKey.PLUS].maxMembers ?? 0,
                                        basePrice: price(PRACTICE_BASE_UNIT_CENTS),
                                        staffPrice: price(PRACTICE_STAFF_SEAT_UNIT_CENTS),
                                        clientPrice: price(PRACTICE_CLIENT_SEAT_UNIT_CENTS),
                                    })}
                                </Typography>
                            </details>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
