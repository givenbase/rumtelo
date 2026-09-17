'use client';

import { useState } from 'react';

import { Typography } from '@rumtelo/ui';

import {
    PORTAL_DEMO_ENERGY,
    PORTAL_DEMO_GROWTH,
    PORTAL_DEMO_MONEY,
    PORTAL_DEMO_SOUL,
    type Portal,
} from '@/lib/landing-content';

/**
 * The "screen" on the right of the Portals stage.
 *
 * Opens on a hand-built animation of the portal's screen, in app chrome.
 * If the portal has a recording, a "Watch video" control swaps it in on click
 * (user-initiated, so it gets controls). `key={portal.key}` upstream resets both
 * the animation and the video state on every tab change.
 */
export function LandingPortalScreen({
    portal,
    reducedMotion,
    onVideoToggle,
}: {
    portal: Portal;
    reducedMotion: boolean;
    /** Lets the stage pause auto-advance while a video is open. */
    onVideoToggle?: (open: boolean) => void;
}) {
    const [videoOpen, setVideoOpen] = useState(false);
    const hasVideo = Boolean(portal.media);

    const toggleVideo = () => {
        const next = !videoOpen;
        setVideoOpen(next);
        onVideoToggle?.(next);
    };

    return (
        <div
            className="relative min-w-0 overflow-hidden rounded-2xl border border-line bg-surface shadow-lg ring-1 ring-fg/8 ring-inset dark:ring-white/8"
            aria-label={`${portal.name} in the app — ${portal.demo.screen}`}>
            <span
                className="absolute inset-x-0 top-0 block h-1"
                style={{ background: portal.colorVar }}
            />

            {/* Title bar — the tabs above already say which portal this is; only name the screen */}
            <div className="flex items-center justify-between gap-3 border-b border-line px-4 pt-4 pb-3">
                <span className="inline-flex min-w-0 items-center gap-2">
                    <span
                        className="size-1.5 shrink-0 rounded-full"
                        style={{ background: portal.colorVar }}
                        aria-hidden
                    />
                    <span className="truncate font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        {portal.demo.screen}
                    </span>
                </span>

                {videoOpen ? (
                    <button
                        type="button"
                        onClick={toggleVideo}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 font-mono text-[10px] font-semibold tracking-widest text-fg-muted uppercase transition-colors hover:text-fg">
                        <span aria-hidden>←</span> Back to demo
                    </button>
                ) : null}
            </div>

            <div className="p-4 sm:p-5" data-demo>
                {/* Stage — one fixed height for every portal and for the video, so tabs never jump */}
                <div className="relative h-88 overflow-hidden">
                    {videoOpen && portal.media ? (
                        <video
                            className="size-full rounded-xl border border-line bg-sunken object-cover"
                            src={portal.media.video}
                            poster={portal.media.poster}
                            autoPlay={!reducedMotion}
                            controls
                            muted
                            loop
                            playsInline
                            preload="metadata"
                        />
                    ) : (
                        <>
                            {/* Mock keeps clear of the play bar so nothing ends up underneath it */}
                            <div className={hasVideo ? 'h-full pb-16' : 'h-full'}>
                                <DemoScreen portalKey={portal.key} />
                            </div>

                            {/* Play affordance — covers the stage, reveals after the animation has had its say */}
                            {hasVideo ? (
                                <button
                                    type="button"
                                    onClick={toggleVideo}
                                    aria-label={`Watch ${portal.name} in action — short video, no sound`}
                                    className="group absolute inset-0 flex cursor-pointer items-end rounded-xl text-left focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">
                                    <span
                                        className="flex w-full animate-[demoPop_520ms_var(--ease-out)_both] items-center justify-between gap-3 bg-linear-to-t from-surface via-surface/92 to-transparent px-2 pt-14 pb-2"
                                        style={{ animationDelay: '2400ms' }}>
                                        <span className="flex items-center gap-3">
                                            <span
                                                className="relative grid size-11 shrink-0 place-items-center rounded-full text-bg shadow-md transition-transform group-hover:scale-105"
                                                style={{ background: portal.colorVar }}>
                                                <span
                                                    className="absolute inset-0 animate-[demoPing_1.8s_ease-out_infinite] rounded-full"
                                                    style={{ background: portal.colorVar }}
                                                    aria-hidden
                                                />
                                                <svg
                                                    viewBox="0 0 12 12"
                                                    className="relative size-4 translate-x-px fill-current"
                                                    aria-hidden>
                                                    <path d="M3 1.5v9l7-4.5z" />
                                                </svg>
                                            </span>
                                            <span className="grid gap-0.5">
                                                <Typography as="h4" weight="semibold">
                                                    Watch {portal.name} in action
                                                </Typography>
                                                <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                                                    Short video · no sound
                                                </span>
                                            </span>
                                        </span>
                                        <span className="hidden font-mono text-[10px] font-semibold tracking-widest text-fg-muted uppercase transition-colors group-hover:text-fg sm:inline">
                                            Play →
                                        </span>
                                    </span>
                                </button>
                            ) : null}
                        </>
                    )}
                </div>

                {/* Coach line — every screen opens with one sentence and one move */}
                <div
                    className="mt-4 flex animate-[demoPop_520ms_var(--ease-out)_both] items-start gap-2.5 rounded-xl border border-line bg-raised px-3.5 py-3"
                    style={{ animationDelay: '1800ms' }}>
                    <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                        style={{ background: portal.colorVar }}
                    />
                    <span className="grid gap-0.5">
                        <span className="font-mono text-[10px] font-medium tracking-widest text-accent uppercase">
                            The Coach
                        </span>
                        {/* Reserve two lines so a one-line tip doesn't change the card height */}
                        <span className="min-h-10 text-sm leading-snug text-fg-secondary">
                            {portal.demo.coach}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}

function DemoScreen({ portalKey }: { portalKey: Portal['key'] }) {
    switch (portalKey) {
        case 'money':
            return <MoneyDemo />;
        case 'growth':
            return <GrowthDemo />;
        case 'energy':
            return <EnergyDemo />;
        case 'soul':
        default:
            return <SoulDemo />;
    }
}

/* ─────────────────────────── money · inbox sorting ─────────────────────────── */

function MoneyDemo() {
    const { rows, overLine } = PORTAL_DEMO_MONEY;
    return (
        <div className="flex h-full flex-col justify-between gap-2">
            {rows.map((row, index) => (
                <div
                    key={row.label}
                    className="grid animate-[demoRow_420ms_var(--ease-out)_both] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2"
                    style={{ animationDelay: `${index * 260}ms` }}>
                    <span className="grid min-w-0 gap-0.5">
                        <span className="truncate text-sm text-fg">{row.label}</span>
                        <span
                            className="inline-flex animate-[demoPop_380ms_var(--ease-out)_both] items-center gap-1.5 font-mono text-[10px] font-medium tracking-wide uppercase"
                            style={{
                                animationDelay: `${index * 260 + 360}ms`,
                                color: row.colorVar,
                            }}>
                            <span
                                className="size-1.5 rounded-full"
                                style={{ background: row.colorVar }}
                            />
                            {row.jar}
                        </span>
                    </span>
                    <span
                        className={`font-mono text-sm font-medium ${
                            row.amount.startsWith('+') ? 'text-accent' : 'text-fg'
                        }`}>
                        {row.amount}
                    </span>
                </div>
            ))}
            <div
                className="mt-1 flex animate-[demoPop_420ms_var(--ease-out)_both] items-center justify-between gap-3 rounded-lg border px-3 py-2"
                style={{
                    animationDelay: `${rows.length * 260 + 200}ms`,
                    borderColor: 'color-mix(in oklab, var(--color-jar-play) 45%, transparent)',
                    background: 'color-mix(in oklab, var(--color-jar-play) 10%, transparent)',
                }}>
                <span className="font-mono text-[10px] font-semibold tracking-widest text-jar-play uppercase">
                    {overLine.jar} · {overLine.over} over its line
                </span>
                <span className="font-mono text-[10px] font-medium tracking-wide text-fg-faint uppercase">
                    signal, not a verdict
                </span>
            </div>
        </div>
    );
}

/* ─────────────────────────── growth · goals + income curve ─────────────────────────── */

function GrowthDemo() {
    const { goals, income, incomeLabel } = PORTAL_DEMO_GROWTH;
    const width = 320;
    const height = 90;
    const min = Math.min(...income);
    const max = Math.max(...income);
    const points = income.map((value, index) => {
        const px = (index / (income.length - 1)) * (width - 8) + 4;
        const py = height - 6 - ((value - min) / (max - min || 1)) * (height - 14);
        return [px, py] as const;
    });
    const path = points
        .map(
            ([px, py], pointIndex) =>
                `${pointIndex === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`
        )
        .join(' ');
    const last = points[points.length - 1]!;

    return (
        <div className="flex h-full flex-col justify-between gap-3">
            <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        Income · six months
                    </span>
                    <span className="font-mono text-xs font-semibold text-jar-lts">
                        {incomeLabel}
                    </span>
                </div>
                <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="h-16 w-full overflow-visible"
                    aria-hidden>
                    <path
                        d={path}
                        fill="none"
                        stroke="var(--color-jar-lts)"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        pathLength={600}
                        strokeDasharray={600}
                        className="animate-[demoDraw_1400ms_var(--ease-out)_both]"
                        style={{ ['--dash' as string]: 600 }}
                    />
                    <circle
                        cx={last[0]}
                        cy={last[1]}
                        r="4"
                        fill="var(--color-jar-lts)"
                        className="animate-[demoPop_400ms_var(--ease-out)_both]"
                        style={{
                            animationDelay: '1300ms',
                            transformOrigin: `${last[0]}px ${last[1]}px`,
                        }}
                    />
                </svg>
            </div>

            <div className="grid gap-2">
                {goals.map((goal, index) => (
                    <div
                        key={goal.name}
                        className="grid animate-[demoRow_420ms_var(--ease-out)_both] gap-1"
                        style={{ animationDelay: `${600 + index * 220}ms` }}>
                        <div className="flex items-baseline justify-between gap-3">
                            <span className="truncate text-sm text-fg">{goal.name}</span>
                            <span className="font-mono text-xs font-semibold text-jar-lts">
                                {goal.pct}%
                            </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-sunken">
                            <span
                                className="block h-full animate-[demoFill_900ms_var(--ease-out)_both] rounded-full bg-jar-lts"
                                style={{
                                    width: `${goal.pct}%`,
                                    animationDelay: `${800 + index * 220}ms`,
                                }}
                            />
                        </div>
                        <span className="font-mono text-[10px] font-medium tracking-wide text-fg-faint uppercase">
                            {goal.meta}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/* ─────────────────────────── energy · sleep bars + 168 hours ─────────────────────────── */

function EnergyDemo() {
    const { nights, floor, days, hours } = PORTAL_DEMO_ENERGY;
    const maxHours = 9;
    const total = hours.reduce((sum, item) => sum + item.value, 0);

    return (
        <div className="flex h-full flex-col justify-between gap-4">
            <div className="rounded-xl border border-line bg-surface p-3">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        Sleep · floor {floor}h
                    </span>
                    <span className="font-mono text-xs font-semibold text-jar-play">
                        {nights.filter(night => night < floor).length} nights under
                    </span>
                </div>
                <div className="grid gap-1.5">
                    {/* Bars — flex column so the % heights resolve against a definite box */}
                    <div className="relative flex h-24 items-end gap-2">
                        <span
                            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-fg/25"
                            style={{ bottom: `${(floor / maxHours) * 100}%` }}
                            aria-hidden
                        />
                        {nights.map((value, index) => {
                            const under = value < floor;
                            return (
                                <span
                                    key={`${days[index]}-${value}`}
                                    className="block flex-1 origin-bottom animate-[demoGrow_620ms_var(--ease-out)_both] rounded-md"
                                    style={{
                                        height: `${(value / maxHours) * 100}%`,
                                        background: under
                                            ? 'var(--color-jar-play)'
                                            : 'color-mix(in oklab, var(--color-jar-play) 35%, var(--color-sunken))',
                                        animationDelay: `${index * 110}ms`,
                                    }}
                                />
                            );
                        })}
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {days.map(day => (
                            <span
                                key={day}
                                className="text-center font-mono text-[10px] text-fg-faint">
                                {day}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            <div className="grid gap-2">
                <div className="flex items-baseline justify-between">
                    <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        Your 168 hours
                    </span>
                    <span className="font-mono text-xs font-medium text-fg">{total}h</span>
                </div>
                <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-sunken">
                    {hours.map((item, index) => (
                        <span
                            key={item.label}
                            className="h-full animate-[demoFill_800ms_var(--ease-out)_both]"
                            style={{
                                width: `${(item.value / total) * 100}%`,
                                background: item.colorVar,
                                animationDelay: `${900 + index * 140}ms`,
                            }}
                        />
                    ))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {hours.map(item => (
                        <span
                            key={item.label}
                            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-fg-muted">
                            <span
                                className="size-1.5 rounded-full"
                                style={{ background: item.colorVar }}
                            />
                            {item.label} <span className="text-fg-faint">{item.value}h</span>
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

/* ─────────────────────────── soul · stillness + gratitude + intention ─────────────────────────── */

function SoulDemo() {
    const { stillnessSeconds, streakDays, gratitude, intention } = PORTAL_DEMO_SOUL;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;

    return (
        <div className="grid h-full content-center gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div className="grid justify-items-center gap-2 self-stretch rounded-xl border border-line bg-surface p-4 sm:content-center">
                <svg viewBox="0 0 84 84" className="size-28" aria-hidden>
                    <circle
                        cx="42"
                        cy="42"
                        r={radius}
                        fill="none"
                        stroke="var(--color-sunken)"
                        strokeWidth="6"
                    />
                    <circle
                        cx="42"
                        cy="42"
                        r={radius}
                        fill="none"
                        stroke="var(--color-portal-soul)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        transform="rotate(-90 42 42)"
                        className="animate-[demoDraw_2400ms_var(--ease-out)_both]"
                        style={{ ['--dash' as string]: circumference }}
                    />
                    <text
                        x="42"
                        y="46"
                        textAnchor="middle"
                        className="fill-fg font-mono text-[13px] font-semibold">
                        {stillnessSeconds}s
                    </text>
                </svg>
                <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                    Stillness · day {streakDays}
                </span>
            </div>

            <div className="grid gap-3">
                <div className="grid gap-1.5">
                    <span className="font-mono text-[10px] font-medium tracking-widest text-fg-faint uppercase">
                        Gratitude · today
                    </span>
                    {gratitude.map((line, index) => (
                        <span
                            key={line}
                            className="flex animate-[demoRow_420ms_var(--ease-out)_both] items-baseline gap-2 text-sm text-fg-secondary"
                            style={{ animationDelay: `${400 + index * 380}ms` }}>
                            <span className="text-portal-soul" aria-hidden>
                                ✦
                            </span>
                            {line}
                        </span>
                    ))}
                </div>
                <div
                    className="animate-[demoPop_420ms_var(--ease-out)_both] rounded-lg border border-line bg-surface px-3 py-2.5"
                    style={{ animationDelay: '1600ms' }}>
                    <span className="block font-mono text-[10px] font-medium tracking-widest text-portal-soul uppercase">
                        Intention · this week
                    </span>
                    <Typography as="h4" weight="medium" className="mt-1">
                        {intention}
                        <span
                            className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-[demoBlink_1s_steps(1)_infinite] bg-portal-soul"
                            aria-hidden
                        />
                    </Typography>
                </div>
            </div>
        </div>
    );
}
