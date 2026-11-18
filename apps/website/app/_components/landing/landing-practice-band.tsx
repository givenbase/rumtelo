'use client';

import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { CARD, Cta, SectionHeading } from './landing-primitives';

/** Short door to `/practices`. No prices here — the page owns them. Keeps the old `/#practices` anchor. */
export function LandingPracticeBand() {
    const t = useTranslations('pages.landing.practice_band');

    return (
        <section id="practices" className="scroll-mt-20">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div
                    className={cn(
                        CARD,
                        'grid min-w-0 items-center gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-10'
                    )}>
                    <SectionHeading
                        eyebrow={t('eyebrow')}
                        headline={t('headline')}
                        lead={t('lead')}
                        headlineClassName="max-w-lg"
                        className="min-w-0"
                    />
                    <div className="grid justify-items-start lg:justify-items-end">
                        <Cta href="/practices" size="lg" className="w-full sm:w-auto">
                            {t('cta')}
                        </Cta>
                    </div>
                </div>
            </div>
        </section>
    );
}
