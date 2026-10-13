'use client';

import { Icon, Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { PRINCIPLES } from '@/lib/landing-content';

import { Eyebrow } from './landing-primitives';

const PRINCIPLE_KEYS = ['split', 'ten_minutes', 'energy', 'information'] as const;

/**
 * Dark band — the four rules the product will not break. Locale owns the title.
 * Scoped `data-theme="dark"` so the band stays navy with readable text in both themes
 * (an inverted `bg-fg` turned light in dark mode and hid the headline in light mode).
 */
export function LandingPrinciples() {
    const t = useTranslations('pages.landing');

    return (
        <section id="principles" data-theme="dark" className="bg-bg-app text-fg">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <Eyebrow className="text-accent-hover">
                            {t('principles_section.eyebrow')}
                        </Eyebrow>
                        <Typography as="h2" size="lg" className="mt-3.5 max-w-xl leading-[1.08]">
                            {t('principles_section.headline')}
                        </Typography>
                    </div>
                </div>

                <ol className="mt-9 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    {PRINCIPLES.map((principle, index) => {
                        const key = PRINCIPLE_KEYS[index]!;
                        return (
                            <li
                                key={key}
                                className="grid content-start gap-3 rounded-2xl border border-line bg-surface/60 p-5 backdrop-blur-sm">
                                <span className="flex items-center justify-between">
                                    <span className="grid size-9 place-items-center rounded-lg border border-line bg-raised text-accent-hover">
                                        <Icon name={principle.icon} size="md" />
                                    </span>
                                    <span className="font-mono text-xs font-semibold tracking-widest text-fg-faint">
                                        0{index + 1}
                                    </span>
                                </span>
                                <Typography as="h3" size="lg" className="leading-snug text-balance">
                                    {t(`principles.${key}.title`)}
                                </Typography>
                                <span className="text-sm leading-relaxed text-pretty text-fg-secondary">
                                    {t(`principles.${key}.body`)}
                                </span>
                            </li>
                        );
                    })}
                </ol>
            </div>
        </section>
    );
}
