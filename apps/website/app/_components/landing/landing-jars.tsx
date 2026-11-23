'use client';

import { Icon, Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { POT_GROUPS } from '@/lib/landing-content';
import { cn } from '@rumtelo/utils';

import { CARD, SectionHeading } from './landing-primitives';

/**
 * Rumtelo Pots — three numbered groups in flow order, each with its pots inside.
 * No shares on purpose: the household sets its own split. Tinted band between Portals and Coach.
 * Anchor stays `#jars` (header/footer links).
 */
export function LandingJars() {
    const t = useTranslations();

    return (
        <section id="jars" className="border-t border-line bg-bg-app">
            <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
                <SectionHeading
                    eyebrow={t('pages.landing.jars_section.eyebrow')}
                    headline={t('pages.landing.jars_section.headline')}
                    lead={t('pages.landing.jars_section.lead')}
                    className="mb-6"
                />

                <p className="mb-5 font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                    {t('features.money.groups.order_hint')}
                </p>

                <ol className="grid grid-cols-1 gap-3.5 lg:grid-cols-3">
                    {POT_GROUPS.map((group, index) => (
                        <li
                            key={group.key}
                            className={cn(CARD, 'grid min-w-0 content-start gap-4 p-5')}>
                            <div className="grid min-w-0 gap-2">
                                <span className="flex min-w-0 items-center gap-3">
                                    <span
                                        aria-hidden
                                        className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-raised font-mono text-sm font-semibold"
                                        style={{ color: group.colorVar }}>
                                        {index + 1}
                                    </span>
                                    <Typography as="h3" size="lg" className="min-w-0 text-balance">
                                        {t(`features.money.groups.${group.key}.title`)}
                                    </Typography>
                                </span>
                                <Typography
                                    as="span"
                                    size="sm"
                                    color="muted"
                                    className="text-pretty">
                                    {t(`features.money.groups.${group.key}.line`)}
                                </Typography>
                            </div>

                            <ul className="grid gap-3 border-t border-line pt-4">
                                {group.pots.map(pot => (
                                    <li key={pot.key} className="flex min-w-0 items-start gap-3">
                                        <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised">
                                            <Icon
                                                name={pot.icon}
                                                size="md"
                                                style={{ color: pot.colorVar }}
                                            />
                                        </span>
                                        <span className="grid min-w-0 gap-0.5">
                                            <span className="text-sm font-medium wrap-break-word text-fg-strong">
                                                {t(`features.money.jars.names.${pot.key}`)}
                                            </span>
                                            <span className="text-sm text-pretty wrap-break-word text-fg-muted">
                                                {t(`features.money.jars.purpose.${pot.key}`)}
                                            </span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}
