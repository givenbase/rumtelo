'use client';

import { useMemo } from 'react';

import type { TimeBand, TimeEntry, TimeTemplate } from '@rumtelo/contracts';
import {
    DISCRETIONARY_BAND,
    TIME_CATEGORY_KIND,
    TIME_REFERENCE,
    TimeCategory,
    TimeDayKind,
    TimeKind,
    bandStatus,
} from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Badge, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    TIME_KIND_META,
    TIME_KIND_ORDER,
    TIME_STATUS_META,
    formatMinutes,
    timeKindName,
    timeStatusName,
} from '@/app/_lib/time-meta';
import { formatDayLabel, shiftDay } from '@/app/_lib/week-key';

import { dayKindName, finalizeDay, templateForDay, weekdayShort } from './day-shape';

type Props = {
    templates: ReadonlyArray<TimeTemplate>;
    /** The current person's entries for the visible week. */
    entries: ReadonlyArray<TimeEntry>;
    /** Monday of the visible week. */
    from: string;
    today: string;
    onEditWeek: () => void;
};

type PlannedDay = {
    iso: string;
    name: string;
    kind: TimeDayKind;
    logged: boolean;
    minutes: Record<TimeCategory, number>;
};

/** A logged day without a template of its own: call it a workday if it held half a shift. */
const WORKDAY_MIN_PAID = 4 * 60;

function sumEntries(rows: ReadonlyArray<TimeEntry>): Record<TimeCategory, number> {
    const full = Object.fromEntries(
        Object.values(TimeCategory).map(category => [category, 0])
    ) as Record<TimeCategory, number>;
    for (const row of rows) full[row.category] += row.minutes;
    return full;
}

/**
 * The week as it will land if every unlogged day goes the way it usually does.
 * Logged days are facts; the rest copy the template. Judged as a full week, so the
 * work and exercise bands — meaningless on three days — finally get to speak.
 */
export function WeekForecast({ templates, entries, from, today, onEditWeek }: Props) {
    const locale = useLocale();
    const tRoot = useTranslations();
    const tf = useTranslations('features.energy.week.forecast');
    const ts = useTranslations('features.energy.week.shape');
    const tm = useTranslations('features.energy.week.meta');
    const weekdays = weekdayShort(ts);
    const days = useMemo<PlannedDay[]>(() => {
        return weekdays.map((name, index) => {
            const iso = shiftDay(from, index);
            const rows = entries.filter(entry => entry.on === iso);
            if (rows.length > 0) {
                const minutes = sumEntries(rows);
                return {
                    iso,
                    name,
                    logged: true,
                    minutes,
                    kind:
                        minutes[TimeCategory.PAID_WORK] >= WORKDAY_MIN_PAID
                            ? TimeDayKind.WORKDAY
                            : TimeDayKind.DAY_OFF,
                };
            }
            const owner = templateForDay(templates, iso);
            return {
                iso,
                name,
                logged: false,
                kind: owner?.template.kind ?? TimeDayKind.DAY_OFF,
                minutes: finalizeDay(owner?.defaults ?? {}),
            };
        });
    }, [templates, entries, from, weekdays]);

    const loggedCount = days.filter(day => day.logged).length;
    if (templates.length === 0 || loggedCount === 7) return null;

    // Split every kind into "already happened" and "still planned" so the bar is honest.
    const kindMinutes = Object.fromEntries(
        TIME_KIND_ORDER.map(kind => [kind, { logged: 0, planned: 0 }])
    ) as Record<TimeKind, { logged: number; planned: number }>;
    const totals = Object.fromEntries(
        Object.values(TimeCategory).map(category => [category, 0])
    ) as Record<TimeCategory, number>;
    for (const day of days) {
        for (const [category, minutes] of Object.entries(day.minutes) as [TimeCategory, number][]) {
            totals[category] += minutes;
            kindMinutes[TIME_CATEGORY_KIND[category]][day.logged ? 'logged' : 'planned'] += minutes;
        }
    }
    const weekTotal = Math.max(
        1,
        Object.values(kindMinutes).reduce((sum, part) => sum + part.logged + part.planned, 0)
    );
    const free = kindMinutes[TimeKind.FREE].logged + kindMinutes[TimeKind.FREE].planned;
    const workdays = days.filter(day => day.kind === TimeDayKind.WORKDAY).length;

    const stat = (label: string, minutes: number, band: TimeBand | null, perDay = false) => {
        const status = bandStatus(minutes, band, 7);
        const meta = TIME_STATUS_META[status];
        return (
            <div key={label} className="grid gap-1 rounded-xl border border-line bg-raised p-3">
                <span className="font-mono text-[11px] tracking-wide text-fg-muted uppercase">
                    {label}
                </span>
                <span className="font-mono text-lg font-semibold text-fg tabular-nums">
                    {formatMinutes(perDay ? Math.round(minutes / 7) : minutes, tRoot)}
                    {perDay ? (
                        <span className="text-xs font-normal text-fg-faint"> {tf('per_day')}</span>
                    ) : null}
                </span>
                {band ? (
                    <span className="justify-self-start">
                        <Badge tone={meta.tone}>{timeStatusName(tm, status)}</Badge>
                    </span>
                ) : null}
            </div>
        );
    };

    const isThisWeek = today >= from && today <= shiftDay(from, 6);
    const title = !isThisWeek
        ? tf('title_next')
        : loggedCount === 0
          ? tf('title_current_empty')
          : tf('title_current');

    return (
        <div className="grid gap-4 rounded-2xl border border-accent/30 bg-accent/5 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <Typography as="span" variant="eyebrow" color="primary">
                        ✦ {title}
                    </Typography>
                    <p className="mt-1 font-mono text-xs text-fg-muted">
                        {workdays === 1
                            ? tf('workday_one', { count: workdays })
                            : tf('workdays_many', { count: workdays })}
                        , {tf('off', { count: 7 - workdays })}
                        {loggedCount > 0
                            ? tf('logged_planned', {
                                  logged: loggedCount,
                                  planned: 7 - loggedCount,
                              })
                            : tf('all_planned')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onEditWeek}
                    className="font-mono text-xs text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                    {tf('change_typical_week')}
                </button>
            </div>

            {/* ── Seven days ── */}
            <div className="grid grid-cols-7 gap-1.5">
                {days.map(day => (
                    <div
                        key={day.iso}
                        title={
                            day.logged
                                ? tf('day_logged', { day: formatDayLabel(day.iso, locale) })
                                : tf('day_planned', {
                                      day: formatDayLabel(day.iso, locale),
                                      kind: dayKindName(ts, day.kind),
                                  })
                        }
                        className={cn(
                            'grid h-12 place-items-center rounded-xl border font-mono text-xs',
                            day.logged
                                ? 'border-line-strong bg-raised text-fg'
                                : 'border-dashed border-line bg-transparent text-fg-secondary',
                            day.iso === today && 'ring-1 ring-accent'
                        )}>
                        <span>{day.name}</span>
                        <span
                            className={cn(
                                'text-[10px]',
                                day.kind === TimeDayKind.WORKDAY ? 'text-fg-muted' : 'text-accent'
                            )}>
                            {day.logged
                                ? '●'
                                : day.kind === TimeDayKind.WORKDAY
                                  ? tf('work')
                                  : tf('off_short')}
                        </span>
                    </div>
                ))}
            </div>

            {/* ── 168-hour bar, planned part faded ── */}
            <div>
                <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-sunken">
                    {TIME_KIND_ORDER.flatMap(kind => [
                        <span
                            key={`${kind}-logged`}
                            className="block h-full"
                            title={tf('kind_logged', {
                                kind: timeKindName(tm, kind),
                                time: formatMinutes(kindMinutes[kind].logged, tRoot),
                            })}
                            style={{
                                width: `${(kindMinutes[kind].logged / weekTotal) * 100}%`,
                                background: TIME_KIND_META[kind].color,
                            }}
                        />,
                        <span
                            key={`${kind}-planned`}
                            className="block h-full opacity-40"
                            title={tf('kind_planned', {
                                kind: timeKindName(tm, kind),
                                time: formatMinutes(kindMinutes[kind].planned, tRoot),
                            })}
                            style={{
                                width: `${(kindMinutes[kind].planned / weekTotal) * 100}%`,
                                background: TIME_KIND_META[kind].color,
                            }}
                        />,
                    ])}
                </div>
                <div className="mt-2 flex flex-wrap gap-4">
                    {TIME_KIND_ORDER.map(kind => (
                        <span
                            key={kind}
                            className="flex items-baseline gap-2 font-mono text-xs text-fg-muted">
                            <span
                                className="size-2 rounded-sm"
                                style={{ background: TIME_KIND_META[kind].color }}
                            />
                            {timeKindName(tm, kind)}{' '}
                            {formatMinutes(
                                kindMinutes[kind].logged + kindMinutes[kind].planned,
                                tRoot
                            )}
                        </span>
                    ))}
                </div>
            </div>

            {/* ── What the bands say about the full week ── */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {stat(
                    tf('stat_work'),
                    totals[TimeCategory.PAID_WORK],
                    TIME_REFERENCE[TimeCategory.PAID_WORK].band
                )}
                {stat(
                    tf('stat_sleep'),
                    totals[TimeCategory.SLEEP],
                    TIME_REFERENCE[TimeCategory.SLEEP].band,
                    true
                )}
                {stat(
                    tf('stat_moving'),
                    totals[TimeCategory.EXERCISE],
                    TIME_REFERENCE[TimeCategory.EXERCISE].band
                )}
                {stat(tf('stat_steer'), free, DISCRETIONARY_BAND, true)}
            </div>

            <p className="max-w-prose text-sm leading-relaxed text-fg-muted">{tf('lead')}</p>
        </div>
    );
}
