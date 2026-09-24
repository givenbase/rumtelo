'use client';

import { Icon, Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { JARS } from '@/lib/landing-content';

import { CARD, SectionHeading } from './landing-primitives';

/** Tinted band — sits between the plain Portals and Coach sections. */
export function LandingJars() {
    const t = useTranslations('pages.landing');

    return (
        <section id="jars" className="border-t border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <SectionHeading
                    eyebrow={t('jars_section.eyebrow')}
                    headline={t('jars_section.headline')}
                    lead={t('jars_section.lead')}
                    className="mb-8"
                />

                <div className="mb-6 grid gap-2">
                    <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken">
                        {JARS.map(jar => (
                            <span
                                key={jar.key}
                                className="h-full"
                                style={{ width: `${jar.pct}%`, background: jar.colorVar }}
                                title={`${t(`jars.${jar.key}.name`)} ${jar.pct}%`}
                            />
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                        {JARS.map(jar => (
                            <span
                                key={jar.key}
                                className="inline-flex items-center gap-1.5 font-mono text-xs text-fg-muted">
                                <span
                                    className="size-1.5 rounded-full"
                                    style={{ background: jar.colorVar }}
                                />
                                {t(`jars.${jar.key}.name`)}{' '}
                                <span className="text-fg-faint">{jar.pct}%</span>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {JARS.map(jar => (
                        <div
                            key={jar.key}
                            className={`${CARD} grid min-w-0 content-start gap-2.5 p-5`}>
                            <span className="flex flex-wrap items-center gap-3">
                                <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-raised">
                                    <Icon
                                        name={jar.icon}
                                        size="lg"
                                        style={{ color: jar.colorVar }}
                                    />
                                </span>
                                <Typography as="h3" size="lg">
                                    {t(`jars.${jar.key}.name`)}
                                </Typography>
                                <span className="ml-auto font-mono text-xs font-semibold text-accent">
                                    {jar.pct}%
                                </span>
                            </span>
                            <Typography as="span" size="sm" color="muted" className="text-pretty">
                                {t(`jars.${jar.key}.line`)}
                            </Typography>
                            <span className="border-t border-line pt-2.5 font-mono text-xs leading-relaxed font-medium tracking-normal text-fg-faint">
                                {t(`jars.${jar.key}.not`)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
