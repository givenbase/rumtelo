'use client';

import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { Card, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

const PRACTICE_KEYS = ['breathing', 'walk', 'meditation', 'journaling'] as const;

const PRACTICE_COLORS: Record<(typeof PRACTICE_KEYS)[number], string> = {
    breathing: 'var(--color-jar-lts)',
    walk: 'var(--color-jar-edu)',
    meditation: 'var(--color-portal-soul)',
    journaling: 'var(--color-jar-give)',
};

export function StillnessPracticeIsland() {
    const t = useTranslations('features.soul.stillness');
    const [minutes, setMinutes] = useState<number>(10);
    const [streak] = useState(0);
    const [markedToday, setMarkedToday] = useState(false);

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            {/* ── Two-column cards ── */}
            <div className="flex flex-wrap items-start gap-4.5">
                {/* Minutes + streak + mark */}
                <div className="grid w-full min-w-0 flex-1 gap-4 rounded-2xl border border-accent/35 bg-surface p-5 shadow-glow sm:min-w-80 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Eyebrow>{t('minutes_per_day')}</Eyebrow>
                        <div className="flex items-baseline gap-2">
                            <Eyebrow>{t('streak_label')}</Eyebrow>
                            <span className="font-display text-xl leading-none font-semibold tracking-tight text-accent">
                                {streak + (markedToday ? 1 : 0)}
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
                            {t('minutes_suffix', { minutes })}
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
                        {markedToday ? t('done_today') : t('mark_done')}
                    </button>
                </div>

                {/* Why it's here */}
                <Card className="w-full min-w-0 flex-1 sm:min-w-70">
                    <Typography as="span" variant="eyebrow" color="primary" className="mb-3">
                        {t('why_title')}
                    </Typography>
                    <p className="text-sm leading-relaxed text-fg-secondary">{t('mind_tie')}</p>
                </Card>
            </div>

            {/* ── Practice cards ── */}
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 lg:grid-cols-3">
                {PRACTICE_KEYS.map(key => {
                    const color = PRACTICE_COLORS[key];
                    return (
                        <div
                            key={key}
                            className="grid gap-2.5 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md"
                            style={{ borderTopColor: color }}>
                            <Typography
                                as="span"
                                variant="eyebrow"
                                color="inherit"
                                style={{ color }}>
                                {t(`practices.${key}.meta`)}
                            </Typography>
                            <Typography as="h3" size="lg">
                                {t(`practices.${key}.name`)}
                            </Typography>
                            <span className="text-sm leading-relaxed text-fg-muted">
                                {t(`practices.${key}.desc`)}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
