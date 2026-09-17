import { Typography } from '@rumtelo/ui';

import { COACH_DEMO, COACH_POINTS, COACH_SECTION, PORTALS } from '@/lib/landing-content';

import { CARD, SectionHeading } from './landing-primitives';

const PORTAL_BY_KEY = Object.fromEntries(PORTALS.map(portal => [portal.key, portal]));

/** Aspirant ↔ mentor. A rendered mock of the in-app Coach — no screenshot placeholder. */
export function LandingCoach() {
    return (
        <section id="coach" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14">
                <div className="min-w-0">
                    <SectionHeading
                        eyebrow={COACH_SECTION.eyebrow}
                        headline={COACH_SECTION.headline}
                        lead={COACH_SECTION.lead}
                        headlineClassName="max-w-md"
                    />
                    <ul className="mt-6 grid gap-2.5">
                        {COACH_POINTS.map(point => (
                            <li key={point} className="flex items-baseline gap-2.5">
                                <span
                                    className="shrink-0 font-mono text-xs text-accent"
                                    aria-hidden>
                                    ✦
                                </span>
                                <Typography as="span" size="sm" color="secondary">
                                    {point}
                                </Typography>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Mock of the Coach feed — mirrors the app's coach card chrome */}
                <div
                    className={`${CARD} relative min-w-0 overflow-hidden p-4 shadow-lg sm:p-5`}
                    aria-label="Example of the Coach — one tip per portal">
                    <span className="absolute inset-x-0 top-0 block h-1 bg-(image:--gradient-accent)" />
                    <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 pt-1">
                        <Typography
                            as="span"
                            variant="eyebrow"
                            color="muted"
                            className="inline-flex items-center gap-2 text-fg-faint">
                            <span className="size-1.5 rounded-full bg-accent" />
                            The Coach · across every portal
                        </Typography>
                        <span className="font-mono text-xs text-fg-faint">week 37</span>
                    </div>

                    <ul className="grid gap-2.5">
                        {COACH_DEMO.map(message => {
                            const portal = PORTAL_BY_KEY[message.portal];
                            return (
                                <li
                                    key={message.kind}
                                    className="grid gap-2.5 rounded-xl border border-l-4 border-line bg-raised px-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                                    style={{ borderLeftColor: portal?.colorVar }}>
                                    <span className="grid min-w-0 gap-1">
                                        <span className="flex flex-wrap items-center gap-2 font-mono text-[10px] font-medium tracking-widest uppercase">
                                            <span style={{ color: portal?.colorVar }}>
                                                {portal?.name}
                                            </span>
                                            <span className="text-fg-faint">· {message.kind}</span>
                                        </span>
                                        <Typography as="h3" size="sm" weight="medium">
                                            {message.text}
                                        </Typography>
                                    </span>
                                    <span className="inline-flex w-fit items-center rounded-full border border-line-strong px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wide whitespace-nowrap text-fg-secondary uppercase">
                                        {message.cta} ›
                                    </span>
                                </li>
                            );
                        })}
                    </ul>

                    <p className="mt-4 text-center font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        one verdict · one move · never shame
                    </p>
                </div>
            </div>
        </section>
    );
}
