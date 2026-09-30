'use client';

import { useState } from 'react';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { Button, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { PageContent } from '@/components/layout/page-content';

const CENTER_IDS = ['root', 'sacral', 'solar', 'heart', 'throat', 'third', 'crown'] as const;

type CenterId = (typeof CENTER_IDS)[number];

const CENTER_COLORS: Record<CenterId, string> = {
    root: '#dc2626',
    sacral: '#ea580c',
    solar: '#ca8a04',
    heart: '#16a34a',
    throat: '#0284c7',
    third: '#4f46e5',
    crown: '#7c3aed',
};

export function CenterPickerIsland() {
    const t = useTranslations('features.soul.centers');
    const [pick, setPick] = useState<CenterId | null>('throat');

    return (
        <PageContent width="prose" className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            {/* ── Center picker ── */}
            <div className="grid gap-2">
                {CENTER_IDS.map(id => {
                    const active = pick === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => setPick(active ? null : id)}
                            className={cn(
                                'flex items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all',
                                active
                                    ? 'border-accent bg-accent-soft'
                                    : 'border-line bg-surface hover:border-accent-hover'
                            )}>
                            <span
                                className="size-2.5 shrink-0 rounded-full"
                                style={{ background: CENTER_COLORS[id] }}
                            />
                            <Typography as="h3" className="min-w-0 flex-1">
                                {t(`items.${id}.name`)}
                            </Typography>
                            <span className="shrink-0 font-mono text-xs text-fg-faint">
                                {t(`items.${id}.gov`)}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* ── Pick detail callout ── */}
            {pick && (
                <div
                    className="grid animate-rise gap-3 rounded-2xl border border-l-4 border-accent/30 bg-surface p-6 shadow-glow"
                    style={{ borderLeftColor: CENTER_COLORS[pick] }}>
                    <Typography
                        as="p"
                        variant="eyebrow"
                        weight="semibold"
                        className="uppercase"
                        style={{ color: CENTER_COLORS[pick] }}>
                        {t(`items.${pick}.name`)}
                    </Typography>
                    <Typography
                        as="h3"
                        weight="medium"
                        className="max-w-prose leading-snug lg:text-xl">
                        {t(`items.${pick}.ask`)}
                    </Typography>
                    <Button
                        as={Link}
                        href="/product/soul/intent"
                        size="sm"
                        className="justify-self-start">
                        {t('set_intent')}
                    </Button>
                </div>
            )}
        </PageContent>
    );
}
