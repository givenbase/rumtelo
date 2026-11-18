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

const FAQ_KEYS = ['replace', 'privacy', 'bank', 'edit', 'money', 'cost'] as const;

/** Native <details>, same pattern as the landing FAQ. */
export function PracticesFaq() {
    const t = useTranslations('pages.practices.faq');
    const locale = useLocale();
    const price = (cents: number) => formatPlanPrice(cents, { locale });

    return (
        <section id="faq" className="scroll-mt-20 border-t border-line">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-14">
                    <SectionHeading eyebrow={t('eyebrow')} headline={t('headline')} />
                    <div className="grid gap-2.5">
                        {FAQ_KEYS.map((key, index) => (
                            <details
                                key={key}
                                open={index === 0}
                                className={cn(CARD, 'group open:border-accent/35')}>
                                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
                                    <Typography as="h3" size="lg" className="min-w-0">
                                        {t(`${key}.question`)}
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
                                    {t(`${key}.answer`, {
                                        basePrice: price(PRACTICE_BASE_UNIT_CENTS),
                                        staffPrice: price(PRACTICE_STAFF_SEAT_UNIT_CENTS),
                                        clientPrice: price(PRACTICE_CLIENT_SEAT_UNIT_CENTS),
                                        discount: PRACTICE_CLIENT_DISCOUNT_PCT,
                                        retail: price(PLAN_RETAIL_CENTS[PlanKey.PLUS].month),
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
