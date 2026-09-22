'use client';

import { Typography } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';

import { PORTALS } from '@/lib/landing-content';

import { CARD, SectionHeading } from './landing-primitives';

const PORTAL_BY_KEY = Object.fromEntries(PORTALS.map(portal => [portal.key, portal]));

const COACH_POINT_KEYS = ['one', 'quiet', 'shame', 'ten'] as const;
const COACH_DEMO_PORTALS = ['money', 'growth', 'energy', 'soul'] as const;

/** Aspirant ↔ mentor. A rendered mock of the in-app Coach — no screenshot placeholder. */
export function LandingCoach() {
    const t = useTranslations('pages.landing');

    return (
        <section id="coach" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
                <div className="min-w-0">
                    <SectionHeading
                        eyebrow={t('coach_section.eyebrow')}
                        headline={t('coach_section.headline')}
                        lead={t('coach_section.lead')}
                        headlineClassName="max-w-md"
                    />
                    <ul className="mt-6 grid gap-2.5">
                        {COACH_POINT_KEYS.map(key => (
                            <li key={key} className="flex items-baseline gap-2.5">
                                <span
                                    className="shrink-0 font-mono text-xs text-accent"
                                    aria-hidden>
                                    ✦
                                </span>
                                <Typography as="span" size="sm" color="secondary">
                                    {t(`coach_section.points.${key}`)}
                                </Typography>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Mock of the Coach feed — mirrors the app's coach card chrome */}
                <div
                    className={`${CARD} relative min-w-0 overflow-hidden p-4 shadow-lg sm:p-5`}
                    aria-label={t('coach_section.demo_aria')}>
                    <span className="absolute inset-x-0 top-0 block h-1 bg-(image:--gradient-accent)" />
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 pt-1">
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="muted"
                            className="inline-flex items-center gap-2 text-fg-faint">
                            <span className="size-1.5 rounded-full bg-accent" />
                            {t('coach_section.demo_feed_eyebrow')}
                        </Typography>
                        <span className="font-mono text-xs text-fg-faint">
                            {t('coach_section.demo_week')}
                        </span>
                    </div>

                    <ul className="grid gap-2.5">
                        {COACH_DEMO_PORTALS.map(portalKey => {
                            const portal = PORTAL_BY_KEY[portalKey];
                            const demo = {
                                kind: t(`coach_section.demo.${portalKey}.kind`),
                                text: t(`coach_section.demo.${portalKey}.text`),
                                cta: t(`coach_section.demo.${portalKey}.cta`),
                            };
                            return (
                                <li
                                    key={portalKey}
                                    className="grid gap-2.5 rounded-xl border border-l-4 border-line bg-raised px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                                    style={{ borderLeftColor: portal?.colorVar }}>
                                    <span className="grid min-w-0 gap-1">
                                        <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-medium tracking-widest uppercase">
                                            <span style={{ color: portal?.colorVar }}>
                                                {t(`portals.${portalKey}.name`)}
                                            </span>
                                            <span className="text-fg-faint">· {demo.kind}</span>
                                        </span>
                                        <Typography as="h3" size="sm" weight="medium">
                                            {demo.text}
                                        </Typography>
                                    </span>
                                    <span className="inline-flex w-fit items-center rounded-full border border-line-strong px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap text-fg-secondary uppercase">
                                        {demo.cta} ›
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mt-4 text-center font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        {t('coach_section.demo_kicker')}
                    </p>
                </div>
            </div>
        </section>
    );
}
