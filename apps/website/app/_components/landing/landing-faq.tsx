'use client';

import { PLAN_LIMITS, PlanKey } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { CARD, SectionHeading } from './landing-primitives';

const FAQ_KEYS = ['budgeting', 'bank', 'sleep', 'coach', 'partner', 'data', 'language'] as const;

/** Native <details> — no client JS, keyboard-accessible, indexable. */
export function LandingFaq() {
    const t = useTranslations('pages.landing');

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
                        {FAQ_KEYS.map((key, index) => (
                            <details
                                key={key}
                                open={index === 0}
                                className={`${CARD} group open:border-accent/35`}>
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
