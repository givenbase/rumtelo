'use client';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CARD, SectionHeading } from '@/components/landing/landing-primitives';

const POINT_KEYS = ['picture', 'between', 'yes'] as const;
const DESK_KEYS = ['f1', 'f2', 'f3', 'f4'] as const;
const CONSENT_KEYS = ['c1', 'c2', 'c3', 'c4'] as const;

function MarkList({ items }: { items: string[] }) {
    return (
        <ul className="mt-4 grid gap-2.5">
            {items.map(item => (
                <li key={item} className="flex min-w-0 items-baseline gap-2.5">
                    <span aria-hidden className="shrink-0 font-mono text-xs text-accent">
                        ✦
                    </span>
                    <span className="text-sm leading-normal text-pretty text-fg-secondary">
                        {item}
                    </span>
                </li>
            ))}
        </ul>
    );
}

/** Three proof points, then what the desk gives and what clients agree to. */
export function PracticesProof() {
    const t = useTranslations('pages.practices');
    const tPlan = useTranslations('pages.landing.practice_plan');

    return (
        <section className="border-y border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <SectionHeading
                    eyebrow={t('proof.eyebrow')}
                    headline={t('proof.headline')}
                    headlineClassName="max-w-lg"
                    className="mb-8"
                />
                <ul className="grid gap-3.5 md:grid-cols-3">
                    {POINT_KEYS.map(key => (
                        <li key={key} className={cn(CARD, 'grid min-w-0 content-start gap-2 p-5')}>
                            <h3 className="font-display text-lg leading-snug font-semibold text-balance text-fg">
                                {t(`proof.points.${key}.title`)}
                            </h3>
                            <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                                {t(`proof.points.${key}.body`)}
                            </p>
                        </li>
                    ))}
                </ul>

                <div className="mt-3.5 grid gap-3.5 md:grid-cols-2">
                    <div className={cn(CARD, 'min-w-0 p-5')}>
                        <h3 className="font-display text-lg font-semibold text-fg">
                            {t('detail.desk_title')}
                        </h3>
                        <MarkList items={DESK_KEYS.map(key => tPlan(key))} />
                    </div>
                    <div className={cn(CARD, 'min-w-0 border-accent/40 p-5')}>
                        <h3 className="font-display text-lg font-semibold text-fg">
                            {t('detail.consent_title')}
                        </h3>
                        <MarkList items={CONSENT_KEYS.map(key => t(`detail.consent.${key}`))} />
                    </div>
                </div>
            </div>
        </section>
    );
}
