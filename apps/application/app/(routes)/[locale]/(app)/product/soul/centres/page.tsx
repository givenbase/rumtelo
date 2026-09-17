'use client';

import { useState } from 'react';

import Link from 'next/link';

import { Button, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { PageContent } from '@/components/layout/page-content';

const CENTRES = [
    {
        id: 'root',
        name: 'Root',
        gov: 'Survival',
        color: '#dc2626',
        ask: 'What would make you one step safer today?',
    },
    {
        id: 'sacral',
        name: 'Sacral',
        gov: 'Creativity',
        color: '#ea580c',
        ask: 'Where are you saying yes when you mean no?',
    },
    {
        id: 'solar',
        name: 'Solar plexus',
        gov: 'Willpower',
        color: '#ca8a04',
        ask: 'Which decision are you postponing because you are tired?',
    },
    {
        id: 'heart',
        name: 'Heart',
        gov: 'Love',
        color: '#16a34a',
        ask: 'To whom do you give today without keeping score?',
    },
    {
        id: 'throat',
        name: 'Throat',
        gov: 'Expression',
        color: '#0284c7',
        ask: 'Which truth would lighten your week if you spoke it?',
    },
    {
        id: 'third',
        name: 'Third eye',
        gov: 'Insight',
        color: '#4f46e5',
        ask: 'Which pattern do you already see but not yet name?',
    },
    {
        id: 'crown',
        name: 'Crown',
        gov: 'Connection',
        color: '#7c3aed',
        ask: 'Why are you really doing this — beyond the numbers?',
    },
] as const;

export default function ChakraPage() {
    const [pick, setPick] = useState<(typeof CENTRES)[number] | null>(CENTRES[4]);

    return (
        <PageContent width="prose" className="grid animate-rise gap-6">
            <Section eyebrow="The centres" title="Where does it feel stuck?">
                <Typography as="p" variant="lead" size="default">
                    Not an esoteric score — a map to name where things feel stuck this week, so your
                    intention has somewhere to land.
                </Typography>
            </Section>

            {/* ── Centre picker ── */}
            <div className="grid gap-2">
                {CENTRES.map(centre => {
                    const active = pick?.id === centre.id;
                    return (
                        <button
                            key={centre.id}
                            type="button"
                            onClick={() => setPick(active ? null : centre)}
                            className={cn(
                                'flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all',
                                active
                                    ? 'border-accent/40 bg-accent-soft'
                                    : 'border-line bg-surface hover:border-accent-hover'
                            )}>
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: centre.color }}
                            />
                            <span
                                className={cn(
                                    'min-w-0 flex-1 font-display text-lg font-semibold',
                                    active ? 'text-fg' : 'text-fg'
                                )}>
                                {centre.name}
                            </span>
                            <span className="shrink-0 font-mono text-xs text-fg-faint">
                                {centre.gov}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Pick detail callout ── */}
            {pick && (
                <div
                    className="grid animate-rise gap-3 rounded-2xl border border-l-4 border-accent/30 bg-surface p-6 shadow-glow"
                    style={{ borderLeftColor: pick.color }}>
                    <p
                        className="font-mono text-xs font-semibold tracking-widest uppercase"
                        style={{ color: pick.color }}>
                        {pick.name}
                    </p>
                    <p className="max-w-prose font-display text-lg leading-snug font-medium text-fg lg:text-xl">
                        {pick.ask}
                    </p>
                    <Button
                        as={Link}
                        href="/product/soul/intent"
                        size="sm"
                        className="justify-self-start">
                        Set as intention →
                    </Button>
                </div>
            )}
        </PageContent>
    );
}
