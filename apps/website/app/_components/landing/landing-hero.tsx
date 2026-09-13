'use client';

import { useEffect, useRef, useState } from 'react';

import { useMarketingSession } from '@/app/_components/marketing-session-provider';
import {
    DEMO_INCOME_DEFAULT,
    DEMO_INCOME_LINE,
    FLOATERS,
    HERO,
    HERO_VIDEO,
    JARS,
    PROOF,
    TICKER,
} from '@/lib/landing-content';
import { appHomeUrl, appPlanSettingsUrl, webSignUpPath } from '@/lib/portal-urls';

import { Cta, Eyebrow } from './landing-primitives';
import { formatCatalogMajor } from './landing-money';

const PLAN_SHORT = { BASIC: 'Basic', PLUS: 'Plus', MAX: 'Max' } as const;

function ease(value: number) {
    const clamped = Math.min(1, Math.max(0, value));
    return 1 - Math.pow(1 - clamped, 3);
}

export function LandingHero() {
    const income = DEMO_INCOME_DEFAULT;
    const [landP, setLandP] = useState(1);
    const [splitP, setSplitP] = useState(1);
    const rafRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);
    const videoRef = useRef<HTMLVideoElement>(null);
    const { isAuthenticated, planKey } = useMarketingSession();

    // Background video: honour reduced motion (poster only) and don't decode while off-screen.
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return undefined;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        let visible = true;
        const sync = () => {
            if (mq.matches || !visible || document.hidden) {
                video.pause();
            } else {
                void video.play().catch(() => undefined);
            }
        };
        const io = new IntersectionObserver(
            ([entry]) => {
                visible = Boolean(entry?.isIntersecting);
                sync();
            },
            { threshold: 0.05 }
        );
        io.observe(video);
        mq.addEventListener('change', sync);
        document.addEventListener('visibilitychange', sync);
        return () => {
            io.disconnect();
            mq.removeEventListener('change', sync);
            document.removeEventListener('visibilitychange', sync);
        };
    }, []);

    useEffect(() => {
        const loop = () => {
            const t0 = performance.now();
            const tick = (now: number) => {
                const elapsed = (now - t0) / 1000;
                const lp = Math.round(ease(elapsed / 1.1) * 60) / 60;
                const sp = Math.round(ease((elapsed - 1.3) / 1.6) * 60) / 60;
                setLandP(lp);
                setSplitP(sp);
                if (elapsed < 3.2) rafRef.current = requestAnimationFrame(tick);
            };
            rafRef.current = requestAnimationFrame(tick);
        };
        loop();
        timerRef.current = setInterval(() => {
            if (!document.hidden) loop();
        }, 8000);
        return () => {
            clearInterval(timerRef.current);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const demoIncome = formatCatalogMajor(Math.round(income * landP));
    const demoPct = Math.round(100 * splitP) + '%';
    const demoStage =
        splitP >= 1
            ? 'THIS MONTH · EVERY AMOUNT HAS A JOB'
            : landP >= 1
              ? 'SPLITTING ACROSS SIX JARS…'
              : 'INCOME LANDING…';

    return (
        <section className="relative overflow-hidden border-b border-line">
            {/* Background video — decorative; light scrim below keeps copy readable without hiding the clip */}
            <video
                ref={videoRef}
                className="pointer-events-none absolute inset-0 size-full object-cover object-[60%_center]"
                src={HERO_VIDEO.src}
                poster={HERO_VIDEO.poster}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                aria-hidden
                tabIndex={-1}
            />
            {/* Scrim: protect the headline, leave the rest open so the video reads */}
            <span className="pointer-events-none absolute inset-0 bg-linear-to-b from-bg/80 via-bg/48 to-bg/58 md:bg-linear-to-r md:from-bg/94 md:via-bg/54 md:via-40% md:to-bg/28 dark:from-bg/84 dark:via-bg/56 dark:to-bg/64 dark:md:from-bg/94 dark:md:via-bg/56 dark:md:to-bg/36" />
            {/* Soft floor fade into the next section */}
            <span className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-bg to-transparent" />
            {/* Brand tint — quiet, so it doesn’t wash the footage */}
            <span className="pointer-events-none absolute inset-[-20%_-10%] animate-[drift_16s_ease-in-out_infinite] bg-(image:--gradient-page) opacity-40" />

            {/* Floating labels — desktop only to keep the mobile hero clear */}
            <div
                className="pointer-events-none absolute inset-0 hidden overflow-hidden md:block"
                aria-hidden>
                {FLOATERS.map(fl => (
                    <span
                        key={fl.text}
                        data-float
                        className="absolute font-mono font-medium tracking-normal whitespace-nowrap opacity-0"
                        style={{
                            left: fl.left,
                            top: fl.top,
                            fontSize: fl.size,
                            color: fl.color,
                            ['--fl-o' as string]: fl.opacity,
                            animation: `floatUp ${fl.dur} linear ${fl.delay} infinite`,
                        }}>
                        {fl.text}
                    </span>
                ))}

                {/* Ticker */}
                <div className="absolute inset-x-0 bottom-2.5 overflow-hidden mask-x-from-88% mask-x-to-100%">
                    <div
                        data-ticker
                        className="inline-flex animate-[tickerX_52s_linear_infinite] gap-10 pr-10 whitespace-nowrap">
                        {TICKER.map(tk => (
                            <span
                                key={tk.key}
                                className="inline-flex items-center gap-2 font-mono text-xs font-medium tracking-widest text-fg-faint opacity-55">
                                <span
                                    className="size-1 shrink-0 rounded-full"
                                    style={{ background: tk.dot }}
                                />
                                {tk.text}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-stretch gap-8 px-4 py-12 pb-14 md:flex-row md:flex-wrap md:items-center lg:gap-16 lg:px-6 lg:py-24 lg:pb-20">
                {/* Left column */}
                <div className="min-w-0 flex-1 animate-[rise_520ms_var(--ease-out)_both] md:basis-96">
                    <Eyebrow>
                        {HERO.eyebrow.split(' · ').map((word, index, words) => (
                            <span key={word} className="inline-flex items-center gap-x-2">
                                <span>{word}</span>
                                {index < words.length - 1 ? (
                                    <span aria-hidden className="text-accent/70">
                                        ·
                                    </span>
                                ) : null}
                            </span>
                        ))}
                    </Eyebrow>
                    <h1 className="my-4 max-w-md font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance text-fg sm:text-5xl sm:leading-[1.02] lg:max-w-lg lg:text-7xl">
                        {HERO.headline}
                    </h1>
                    <p className="mb-7 max-w-prose text-base leading-relaxed text-pretty text-fg-muted lg:text-lg">
                        {HERO.lead}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                        {isAuthenticated ? (
                            <>
                                <Cta href={appHomeUrl()} size="lg">
                                    Open dashboard
                                </Cta>
                                <Cta href={appPlanSettingsUrl()} variant="ghost" size="lg">
                                    {planKey ? `Manage ${PLAN_SHORT[planKey]}` : 'Manage plan'}
                                </Cta>
                            </>
                        ) : (
                            <>
                                <Cta href={webSignUpPath()} size="lg">
                                    {HERO.ctaPrimary}
                                </Cta>
                                <Cta href="#jars" variant="ghost" size="lg">
                                    {HERO.ctaSecondary}
                                </Cta>
                            </>
                        )}
                    </div>

                    {/* Proof stats */}
                    <div className="mt-9 grid grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:flex-wrap">
                        {PROOF.map(item => (
                            <span key={item.label} className="grid gap-0.5">
                                <span className="font-display text-2xl font-semibold tracking-tight text-fg">
                                    {item.value}
                                </span>
                                <span className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                    {item.label}
                                </span>
                            </span>
                        ))}
                    </div>
                </div>

                {/* Demo card */}
                <div className="w-full min-w-0 flex-1 animate-[rise_620ms_var(--ease-out)_both,floaty_7s_ease-in-out_1.4s_infinite] overflow-hidden rounded-2xl border border-line bg-surface shadow-lg ring-1 ring-fg/8 ring-inset md:basis-96 dark:ring-white/8">
                    <span className="block h-1 bg-(image:--gradient-accent)" />
                    <div className="p-5 lg:p-7">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <span className="font-mono text-xs font-medium tracking-widest text-fg-faint uppercase">
                                {demoStage}
                            </span>
                            <span className="font-mono text-xs font-semibold text-accent">
                                {demoPct}
                            </span>
                        </div>
                        <div className="my-2.5 mb-1 font-display text-4xl font-semibold tracking-tight text-fg lg:text-5xl">
                            {demoIncome}
                        </div>
                        <div className="mb-5 text-sm text-fg-muted">{DEMO_INCOME_LINE}</div>

                        {/* Bar */}
                        <div className="mb-5 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sunken">
                            {JARS.map(j => (
                                <span
                                    key={j.key}
                                    className="transition-[width] duration-75"
                                    style={{ width: `${j.pct * splitP}%`, background: j.colorVar }}
                                />
                            ))}
                        </div>

                        {/* Jar rows */}
                        <div className="grid gap-2.5">
                            {JARS.map(j => (
                                <span
                                    key={j.key}
                                    className="grid grid-cols-[10px_minmax(0,1fr)_auto_auto] items-center gap-2.5">
                                    <span
                                        className="size-2 rounded-sm"
                                        style={{ background: j.colorVar }}
                                    />
                                    <span className="min-w-0 text-sm text-fg-strong">{j.name}</span>
                                    <span className="font-mono text-xs font-medium text-fg-faint">
                                        {j.pct}%
                                    </span>
                                    <span className="font-mono text-sm font-medium text-fg">
                                        {formatCatalogMajor(Math.round(((income * j.pct) / 100) * splitP))}
                                    </span>
                                </span>
                            ))}
                        </div>

                        {/* Coach one-liner — the hero already hints that the app talks back */}
                        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-line bg-raised px-3.5 py-3">
                            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                            <span className="grid gap-0.5">
                                <span className="font-mono text-[10px] font-medium tracking-widest text-accent uppercase">
                                    The Coach · this week
                                </span>
                                <span className="text-sm leading-snug text-fg-secondary">
                                    Every amount has a job. Safe to spend today:{' '}
                                    <span className="font-mono font-medium text-fg">€64</span>.
                                    Sleep was 7h20 — a good week to decide things.
                                </span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
