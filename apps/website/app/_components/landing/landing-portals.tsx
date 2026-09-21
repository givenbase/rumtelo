'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

import { Typography } from '@rumtelo/ui';

import { PORTALS, PORTALS_SECTION } from '@/lib/landing-content';
import { webSignUpPath, appSignInUrl } from '@/lib/portal-urls';
import { isRegistrationOpen } from '@/lib/maintenance';

import { LandingIcon } from './landing-icon';
import { LandingPortalScreen } from './landing-portal-screen';
import { Cta, SectionHeading } from './landing-primitives';

/** How long each portal stays on stage before the next one auto-advances. */
const AUTO_ADVANCE_MS = 9000;

/**
 * Money is the door; the rest of the picture opens here.
 * One portal on stage at a time — the same "you are always inside exactly one" as the app.
 */
export function LandingPortals() {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);
    const [reducedMotion, setReducedMotion] = useState(false);
    const [cycle, setCycle] = useState(0);
    const [videoOpen, setVideoOpen] = useState(false);
    const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);
    const baseId = useId();

    const portal = PORTALS[index]!;

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sync = () => setReducedMotion(mq.matches);
        sync();
        mq.addEventListener('change', sync);
        return () => mq.removeEventListener('change', sync);
    }, []);

    const select = useCallback((next: number, focus = false) => {
        const clamped = (next + PORTALS.length) % PORTALS.length;
        setIndex(clamped);
        setCycle(current => current + 1);
        setVideoOpen(false);
        if (focus) tabsRef.current[clamped]?.focus();
    }, []);

    // Auto-advance unless the visitor is hovering, focused inside, watching a video,
    // or prefers reduced motion. `cycle` is part of the timer key on purpose:
    // re-selecting the same tab restarts the clock.
    const holdStage = paused || videoOpen || reducedMotion;
    useEffect(() => {
        if (holdStage) return undefined;
        const id = window.setTimeout(() => select(index + 1), AUTO_ADVANCE_MS);
        return () => window.clearTimeout(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- cycle restarts the timer intentionally
    }, [index, cycle, holdStage, select]);

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            select(index + 1, true);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            select(index - 1, true);
        } else if (event.key === 'Home') {
            event.preventDefault();
            select(0, true);
        } else if (event.key === 'End') {
            event.preventDefault();
            select(PORTALS.length - 1, true);
        }
    };

    const showProgress = !holdStage;

    return (
        <section id="portals" className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-20">
            <SectionHeading
                eyebrow={PORTALS_SECTION.eyebrow}
                headline={PORTALS_SECTION.headline}
                lead={PORTALS_SECTION.lead}
                headlineClassName="max-w-2xl"
            />

            <div
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocusCapture={() => setPaused(true)}
                onBlurCapture={event => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                        setPaused(false);
                    }
                }}>
                {/* The switch — the same strip that sits at the top of the app, now live */}
                <div
                    role="tablist"
                    aria-label="Portals"
                    tabIndex={-1}
                    onKeyDown={onKeyDown}
                    className="mt-8 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-line bg-raised p-1">
                    {PORTALS.map((item, itemIndex) => {
                        const active = itemIndex === index;
                        return (
                            <button
                                key={item.key}
                                ref={node => {
                                    tabsRef.current[itemIndex] = node;
                                }}
                                type="button"
                                role="tab"
                                id={`${baseId}-tab-${item.key}`}
                                aria-selected={active}
                                aria-controls={`${baseId}-panel`}
                                tabIndex={active ? 0 : -1}
                                onClick={() => select(itemIndex)}
                                className={`relative inline-flex items-center gap-2 overflow-hidden rounded-full px-3.5 py-1.5 font-mono text-xs font-semibold tracking-widest uppercase transition-colors ${
                                    active
                                        ? 'bg-surface text-fg shadow-md'
                                        : 'text-fg-muted hover:text-fg'
                                }`}>
                                <span
                                    className="size-1.5 rounded-full"
                                    style={{ background: item.colorVar }}
                                />
                                {item.name}
                                {active && showProgress ? (
                                    <span
                                        key={cycle}
                                        aria-hidden
                                        className="absolute inset-x-0 bottom-0 h-0.5 origin-left"
                                        style={{
                                            background: item.colorVar,
                                            animation: `demoProgress ${AUTO_ADVANCE_MS}ms linear both`,
                                        }}
                                    />
                                ) : null}
                            </button>
                        );
                    })}
                </div>

                {/* Stage — detail left, screen right */}
                <div
                    id={`${baseId}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${baseId}-tab-${portal.key}`}
                    className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
                    <article
                        key={`detail-${portal.key}`}
                        className="grid min-w-0 animate-[rise_420ms_var(--ease-out)_both] content-start gap-4">
                        <span className="flex items-center justify-between gap-3">
                            <span
                                className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-raised"
                                style={{ borderColor: portal.colorVar }}>
                                <LandingIcon name={portal.icon} size={21} color={portal.colorVar} />
                            </span>
                            <Typography
                                as="span"
                                variant="eyebrow"
                                color="muted"
                                className="text-fg-faint">
                                {portal.dutch} · {index + 1} / {PORTALS.length}
                            </Typography>
                        </span>

                        <span className="grid gap-1.5">
                            <Typography as="h2" size="lg" weight="semibold">
                                {portal.name}
                            </Typography>
                            <Typography
                                as="h3"
                                size="lg"
                                weight="medium"
                                className="leading-snug text-balance"
                                style={{ color: portal.colorVar }}>
                                {portal.hook}
                            </Typography>
                        </span>

                        <span className="font-mono text-xs font-medium tracking-wide text-fg-muted">
                            {portal.question}
                        </span>

                        <ul className="grid gap-2.5 border-t border-line pt-4">
                            {portal.features.map((feature, featureIndex) => (
                                <li
                                    key={feature}
                                    className="flex animate-[demoRow_360ms_var(--ease-out)_both] items-baseline gap-2.5 text-sm leading-snug text-fg-secondary"
                                    style={{ animationDelay: `${120 + featureIndex * 70}ms` }}>
                                    <span
                                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                                        style={{ background: portal.colorVar }}
                                        aria-hidden
                                    />
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <div className="flex flex-wrap items-center gap-3 pt-1">
                            <Cta
                                href={isRegistrationOpen() ? webSignUpPath() : appSignInUrl()}
                                size="md">
                                {isRegistrationOpen() ? `Start with ${portal.name}` : 'Sign in'}
                            </Cta>
                            <button
                                type="button"
                                onClick={() => select(index + 1, true)}
                                className="font-mono text-xs font-semibold tracking-widest text-fg-muted uppercase transition-colors hover:text-accent">
                                Next portal →
                            </button>
                        </div>
                    </article>

                    <div
                        key={`screen-${portal.key}`}
                        className="animate-[rise_480ms_var(--ease-out)_both]">
                        <LandingPortalScreen
                            portal={portal}
                            reducedMotion={reducedMotion}
                            onVideoToggle={setVideoOpen}
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}
