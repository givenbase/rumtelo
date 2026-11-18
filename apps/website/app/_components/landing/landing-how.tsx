'use client';

import { useTranslations } from '@rumtelo/i18n';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import { isRegistrationOpen } from '@/lib/maintenance';
import { webSignUpPath } from '@/lib/portal-urls';

import { cn } from '@rumtelo/utils';

import { CARD, Cta, SectionHeading } from './landing-primitives';

const STEP_KEYS = ['split', 'spend', 'week'] as const;

/** The product in three steps — the mechanism the hero promises, before anything else. */
export function LandingHow() {
    const t = useTranslations('pages.landing');
    const { isAuthenticated } = useMarketingSession();
    const showCta = !isAuthenticated && isRegistrationOpen();

    return (
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-12 lg:px-6 lg:py-20">
            <SectionHeading
                eyebrow={t('how_section.eyebrow')}
                headline={t('how_section.headline')}
                className="mb-8"
            />

            <ol aria-label={t('how_section.steps_aria')} className="grid gap-3.5 md:grid-cols-3">
                {STEP_KEYS.map((key, index) => (
                    <li key={key} className={cn(CARD, 'grid min-w-0 content-start gap-3 p-5')}>
                        <span
                            aria-hidden
                            className="grid size-8 place-items-center rounded-full border border-accent/30 bg-accent-soft font-mono text-xs font-semibold text-accent">
                            {index + 1}
                        </span>
                        <h3 className="font-display text-lg leading-snug font-semibold text-balance text-fg">
                            {t(`how_section.steps.${key}.title`)}
                        </h3>
                        <p className="text-sm leading-relaxed text-pretty text-fg-secondary">
                            {t(`how_section.steps.${key}.body`)}
                        </p>
                    </li>
                ))}
            </ol>

            {showCta ? (
                <div className="mt-8 grid justify-items-start gap-2.5">
                    <Cta href={webSignUpPath()} size="lg" className="w-full sm:w-auto">
                        {t('hero.cta_primary')}
                    </Cta>
                    <p className="text-sm text-fg-muted">{t('hero.cta_microline')}</p>
                </div>
            ) : null}
        </section>
    );
}
