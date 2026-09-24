'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { EnergyMetric } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Card, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { isLiveData } from '@/app/_lib/preview';

const PRACTICE_KEYS = ['breathing', 'walk', 'meditation', 'journaling'] as const;

const PRACTICE_COLORS: Record<(typeof PRACTICE_KEYS)[number], string> = {
    breathing: 'var(--color-jar-lts)',
    walk: 'var(--color-jar-edu)',
    meditation: 'var(--color-portal-soul)',
    journaling: 'var(--color-jar-give)',
};

/** Maps minutes of stillness practice to a 0–100 MIND score for energy.logs. */
function mindScoreFromMinutes(minutes: number): number {
    return Math.min(100, Math.max(20, Math.round((minutes / 45) * 100)));
}

export function StillnessPracticeIsland() {
    const t = useTranslations('features.soul.stillness');
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const live = isLiveData(householdId);
    const [minutes, setMinutes] = useState<number>(10);
    const [streak, setStreak] = useState(0);
    const [markedToday, setMarkedToday] = useState(false);

    const markDone = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('missing household');
            return api.energy.logs.create({
                householdId,
                on: todayIso(),
                metric: EnergyMetric.MIND,
                value: mindScoreFromMinutes(minutes),
                note: t('mind_note', { minutes }),
            });
        },
        onSuccess: async () => {
            setMarkedToday(true);
            setStreak(previous => previous + 1);
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.logs.summary.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.session.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
            ]);
            showToast(t('toast_logged'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow={t('eyebrow')} title={t('title')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            <div className="flex flex-wrap items-start gap-4.5">
                <div className="grid w-full min-w-0 flex-1 gap-4 rounded-2xl border border-accent/35 bg-surface p-5 shadow-glow sm:min-w-80 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <Eyebrow>{t('minutes_per_day')}</Eyebrow>
                        <div className="flex items-baseline gap-2">
                            <Eyebrow>{t('streak_label')}</Eyebrow>
                            <span className="font-display text-xl leading-none font-semibold tracking-tight text-accent">
                                {streak}
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
                        disabled={!live || markedToday || markDone.isPending}
                        onClick={() => markDone.mutate()}
                        className={cn(
                            'rounded-full border px-4 py-3.5 font-mono text-xs font-bold tracking-wide uppercase transition-all',
                            markedToday
                                ? 'border-success/25 bg-success/10 text-success'
                                : 'border-accent bg-accent text-on-accent hover:brightness-110 disabled:opacity-55'
                        )}>
                        {markedToday ? t('done_today') : t('mark_done')}
                    </button>
                </div>

                <Card className="w-full min-w-0 flex-1 sm:min-w-70">
                    <Typography as="span" variant="eyebrow" color="primary" className="mb-3">
                        {t('why_title')}
                    </Typography>
                    <p className="text-sm leading-relaxed text-fg-secondary">{t('mind_tie')}</p>
                </Card>
            </div>

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
