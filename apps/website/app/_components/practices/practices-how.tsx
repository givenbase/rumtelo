'use client';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CARD, SectionHeading } from '@/components/landing/landing-primitives';

const STEP_KEYS = ['invite', 'yes', 'desk'] as const;

/** Invite → they say yes → one desk. */
export function PracticesHow() {
    const t = useTranslations('pages.practices.how');

    return (
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 lg:px-6 lg:py-20">
            <SectionHeading eyebrow={t('eyebrow')} headline={t('headline')} className="mb-8" />
            <ol aria-label={t('steps_aria')} className="grid gap-3.5 md:grid-cols-3">
                {STEP_KEYS.map((key, index) => (
                    <li key={key} className={cn(CARD, 'grid min-w-0 content-start gap-3 p-5')}>
                        <span
                            aria-hidden
                            className="grid size-8 place-items-center rounded-full border border-accent/30 bg-accent-soft font-mono text-xs font-semibold text-accent">
                            {index + 1}
                        </span>
                        <h3 className="font-display text-lg leading-snug font-semibold text-balance text-fg">
                            {t(`steps.${key}.title`)}
                        </h3>
                        <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                            {t(`steps.${key}.body`)}
                        </p>
                    </li>
                ))}
            </ol>
        </section>
    );
}
