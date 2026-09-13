'use client';

import { useState } from 'react';

import { Card, Eyebrow, Section } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

const MIND_TIE =
    'A restless mind does not steer money — it spends it and calls that a decision. Stillness ' +
    'is not meditative, it is strategic: the only practice here that costs nothing and protects ' +
    'everything else. Every coin you do not spend impulsively is a coin that chooses a jar.';

const PRACTICES = [
    {
        meta: '2–5 min',
        name: 'Breathing',
        desc: 'Four counts in, hold seven, out eight. One minute is enough when the day is already full.',
        color: 'var(--color-jar-lts)',
    },
    {
        meta: '10–20 min',
        name: 'Walk',
        desc: 'Without a goal or phone. The mind clears when the feet move.',
        color: 'var(--color-jar-edu)',
    },
    {
        meta: '5–20 min',
        name: 'Meditation',
        desc: 'Eyes closed, attention on the breath. Thoughts come and go — you are not your thoughts.',
        color: 'var(--color-portal-soul)',
    },
    {
        meta: '5–10 min',
        name: 'Journaling',
        desc: 'Write down three things that caught your attention. No analysis, just noting.',
        color: 'var(--color-jar-give)',
    },
] as const;

export default function MindPage() {
    const [minutes, setMinutes] = useState<number>(10);
    const [streak] = useState(0);
    const [markedToday, setMarkedToday] = useState(false);

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow="Stillness" title="Control is a rhythm, not a mood.">
                <p className="max-w-prose text-base text-fg-muted">
                    The only practice here that costs nothing and protects everything else.
                </p>
            </Section>

            {/* ── Two-column cards ── */}
            <div className="flex flex-wrap items-start gap-4.5">
                {/* Minutes + streak + mark */}
                <div className="grid w-full min-w-0 flex-1 gap-4 rounded-2xl border border-accent/35 bg-surface p-5 shadow-glow sm:min-w-80 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Eyebrow>Minutes per day</Eyebrow>
                        <div className="flex items-baseline gap-2">
                            <Eyebrow>In a row</Eyebrow>
                            <span className="font-display text-xl leading-none font-semibold tracking-tight text-accent">
                                {streak + (markedToday ? 1 : 0)}d
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4.5">
                        <input
                            type="range"
                            min={1}
                            max={45}
                            value={minutes}
                            onChange={event => setMinutes(Number(event.target.value))}
                            className="min-w-0 flex-1 accent-accent"
                        />
                        <span className="font-display text-3xl leading-none font-semibold tracking-tight whitespace-nowrap text-accent sm:text-4xl lg:text-5xl">
                            {minutes} min
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() => setMarkedToday(previous => !previous)}
                        className={cn(
                            'rounded-full border px-4 py-3.5 font-mono text-xs font-bold tracking-wide uppercase transition-all',
                            markedToday
                                ? 'border-success/25 bg-success/10 text-success'
                                : 'border-accent bg-accent text-on-accent hover:brightness-110'
                        )}>
                        {markedToday ? '✓ Done today' : 'Mark as done'}
                    </button>
                </div>

                {/* Why it's here */}
                <Card className="w-full min-w-0 flex-1 sm:min-w-70">
                    <Eyebrow className="mb-3 text-accent">✦ Why this is in a money app</Eyebrow>
                    <p className="text-sm leading-relaxed text-fg-secondary">{MIND_TIE}</p>
                </Card>
            </div>

            {/* ── Practice cards ── */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {PRACTICES.map(practice => (
                    <div
                        key={practice.name}
                        className="grid gap-2.5 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md"
                        style={{ borderTopColor: practice.color }}>
                        <span
                            className="font-mono text-xs font-medium tracking-widest uppercase"
                            style={{ color: practice.color }}>
                            {practice.meta}
                        </span>
                        <span className="font-display text-xl font-semibold text-fg">
                            {practice.name}
                        </span>
                        <span className="text-sm leading-relaxed text-fg-muted">
                            {practice.desc}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
