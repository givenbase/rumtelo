'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo, useState } from 'react';

import type { EnergySummary } from '@rumtelo/contracts';
import { DEFAULT_JAR_SPLIT, EnergyMetric, EnergyTrend, JarKey } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Card, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { isLiveData } from '@/app/_lib/preview';
import { DEFAULT_SLEEP_HOURS } from '@/app/_lib/energy-constants';
import { jarChrome } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { useAuth } from '@/components/features/shell/auth-provider';

const DEFAULT_STEERED_HOURS = 40;
const SLEEP_WEEK = DEFAULT_SLEEP_HOURS * 7;

const JAR_BORDER: Record<string, string> = {
    NECESSITIES: 'border-t-jar-nec',
    FINANCIAL_FREEDOM: 'border-t-jar-ff',
    LONG_TERM_SAVINGS: 'border-t-jar-lts',
    EDUCATION: 'border-t-jar-edu',
    PLAY: 'border-t-jar-play',
    GIVE: 'border-t-jar-give',
};

const METRIC_LABEL: Record<EnergyMetric, string> = {
    [EnergyMetric.SLEEP]: 'Sleep',
    [EnergyMetric.TRAIN]: 'Training',
    [EnergyMetric.FOOD]: 'Nutrition',
    [EnergyMetric.MIND]: 'Stillness',
};

const TREND_ICON: Record<EnergyTrend, string> = {
    [EnergyTrend.UP]: '↑',
    [EnergyTrend.FLAT]: '→',
    [EnergyTrend.DOWN]: '↓',
};
const TREND_CLASS: Record<EnergyTrend, string> = {
    [EnergyTrend.UP]: 'text-success',
    [EnergyTrend.FLAT]: 'text-fg-muted',
    [EnergyTrend.DOWN]: 'text-danger',
};

export function WeekPageClient() {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const [steeredHours, setSteeredHours] = useState(DEFAULT_STEERED_HOURS);
    const { jars: catalogJars } = useJarCatalog();
    const hourJars =
        catalogJars.length > 0
            ? catalogJars
            : (Object.values(JarKey) as JarKey[]).map(key => ({
                  key,
                  name: key,
                  icon: '◇',
                  subtitle: '',
                  pct: DEFAULT_JAR_SPLIT[key],
                  text: jarChrome(key).text,
              }));

    const summaryQuery = useLiveQuery(
        apiQuery.energy.logs.summary.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const summary = (summaryQuery.data ?? []) as ReadonlyArray<EnergySummary>;
    const restHours = 168 - SLEEP_WEEK - steeredHours;

    const weekWhole = useMemo(
        () =>
            [
                {
                    name: 'Sleep',
                    hours: `${SLEEP_WEEK}h`,
                    pct: Math.round((SLEEP_WEEK / 168) * 100),
                    color: 'var(--color-jar-lts)',
                },
                {
                    name: 'Everything else',
                    hours: `${restHours}h`,
                    pct: Math.round((restHours / 168) * 100),
                    color: 'var(--color-sunken)',
                },
                {
                    name: 'You steer',
                    hours: `${steeredHours}h`,
                    pct: Math.round((steeredHours / 168) * 100),
                    color: 'var(--color-accent)',
                },
            ] as const,
        [restHours, steeredHours]
    );

    const playHours = Math.round((steeredHours * 10) / 100);

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow="My week" title="Every hour gets a job too.">
                <Typography as="p" variant="lead" size="default">
                    The same six percentages, but spent in hours. Money buys things; hours build the
                    person who earns them.
                </Typography>
            </Section>

            {/* ── Live energy summary ── */}
            {summary.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    {summary.map(stat => (
                        <div
                            key={stat.metric}
                            className="flex items-center gap-3 rounded-xl border border-line bg-raised px-4 py-2.5">
                            <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                                {METRIC_LABEL[stat.metric]}
                            </span>
                            <span className="font-mono text-base font-semibold text-fg">
                                {Math.round(stat.average7d)}
                            </span>
                            <span className={cn('font-mono text-xs', TREND_CLASS[stat.trend])}>
                                {TREND_ICON[stat.trend]}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <Card className="grid gap-5 p-6">
                {/* ── 168-hour overview bar ── */}
                <div>
                    <Eyebrow>Your week has 168 hours</Eyebrow>
                    <div className="mt-3 flex h-3 gap-0.5 overflow-hidden rounded-full">
                        {weekWhole.map(week => (
                            <span
                                key={week.name}
                                title={`${week.name} — ${week.hours}`}
                                className="block h-full"
                                style={{ width: `${week.pct}%`, background: week.color }}
                            />
                        ))}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-4">
                        {weekWhole.map(week => (
                            <span
                                key={week.name}
                                className="flex items-baseline gap-2 font-mono text-xs text-fg-muted">
                                <span
                                    className="size-2 rounded-sm"
                                    style={{ background: week.color }}
                                />
                                {week.name} {week.hours}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-muted">
                        Of those 168 hours you steer about {steeredHours} yourself. The rest goes to
                        sleep, work, and everything that happens without a choice.
                    </p>
                </div>

                {/* ── Steered-hours slider ── */}
                <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
                    <Typography
                        as="span"
                        variant="eyebrow"
                        color="primary"
                        className="whitespace-nowrap">
                        Of which you steer
                    </Typography>
                    <input
                        type="range"
                        min={8}
                        max={70}
                        step={1}
                        value={steeredHours}
                        onChange={event => setSteeredHours(Number(event.target.value))}
                        className="min-w-0 flex-1 accent-accent"
                        aria-label="Hours you steer this week"
                    />
                    <span className="font-display text-3xl font-semibold text-accent tabular-nums">
                        {steeredHours}h
                    </span>
                </div>

                {/* ── Per-jar hour cards ── */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {hourJars.map(j => {
                        const hours = Math.round((steeredHours * j.pct) / 100);
                        return (
                            <div
                                key={j.key}
                                className={cn(
                                    'grid gap-2 rounded-xl border border-t-4 border-line bg-raised p-4',
                                    JAR_BORDER[j.key]
                                )}>
                                <span
                                    className={cn(
                                        'flex items-center gap-2 font-mono text-xs font-medium tracking-wider uppercase',
                                        j.text
                                    )}>
                                    <span aria-hidden>{j.icon}</span>
                                    {j.name}
                                </span>
                                <span className="flex items-baseline gap-2">
                                    <span className="font-display text-2xl font-semibold text-fg tabular-nums">
                                        {hours}h
                                    </span>
                                    <span className="font-mono text-xs text-fg-faint">
                                        {j.pct}%
                                    </span>
                                </span>
                                <span className="text-sm leading-snug text-fg-muted">
                                    {j.subtitle}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* ── Where time and money disagree ── */}
                <div className="border-t border-line pt-5">
                    <Typography as="span" variant="eyebrow" color="primary">
                        ✦ Where time and money diverge
                    </Typography>
                    <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-secondary">
                        You give Play 10% of your money but only{' '}
                        {steeredHours > 0 ? Math.round((playHours / steeredHours) * 100) : 0}% of
                        the hours you steer ({playHours}h). Drag the slider to see how the jars
                        shift when you reclaim more of the week.
                    </p>
                </div>
            </Card>
        </div>
    );
}
