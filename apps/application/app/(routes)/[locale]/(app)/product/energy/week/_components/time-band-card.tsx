'use client';

import type { TimeCategorySummary } from '@rumtelo/contracts';
import { TIME_REFERENCE, TimeBandStatus, TimeKind } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Badge } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    TIME_CATEGORY_META,
    TIME_KIND_META,
    TIME_STATUS_META,
    formatBandHours,
    formatBandRange,
    formatMinutes,
    timeCategoryHint,
    timeCategoryName,
    timeStatusName,
} from '@/app/_lib/time-meta';

import { TimeSources } from './time-sources';

type Props = {
    summary: TimeCategorySummary;
    daysLogged: number;
};

/**
 * One category for the week. When there is an evidence band the status is shown
 * against it; when there is not, the card says so instead of inventing a norm.
 */
export function TimeBandCard({ summary, daysLogged }: Props) {
    const tRoot = useTranslations();
    const tm = useTranslations('features.energy.week.meta');
    const meta = TIME_CATEGORY_META[summary.category];
    const reference = TIME_REFERENCE[summary.category];
    const kind = TIME_KIND_META[summary.kind];
    const band = reference.band;
    // Daily behaviours read as a daily figure; weekly accumulators (work, exercise) as a weekly total.
    const perDay = band ? band.perDay : summary.kind === TimeKind.PERSONAL;

    const rangeText = band
        ? [
              formatBandRange(band.targetLow, band.targetHigh, perDay, tRoot),
              band.floor !== null
                  ? tm('floor', {
                        range: formatBandHours(band.floor, perDay, tRoot),
                    })
                  : null,
              band.ceiling !== null
                  ? tm('ceiling', {
                        range: formatBandHours(band.ceiling, perDay, tRoot),
                    })
                  : null,
          ]
              .filter(Boolean)
              .join(' · ')
        : null;

    const status = daysLogged > 0 ? summary.status : TimeBandStatus.NO_DATA;
    const statusMeta = TIME_STATUS_META[status];

    return (
        <div
            className="grid gap-2.5 rounded-xl border border-t-4 border-line bg-raised p-4"
            style={{ borderTopColor: kind.color }}>
            <div className="flex items-start justify-between gap-2">
                <span className="flex items-center gap-2 font-mono text-xs font-medium tracking-wider text-fg-muted uppercase">
                    <span aria-hidden>{meta.icon}</span>
                    {timeCategoryName(tm, summary.category)}
                </span>
                {band ? (
                    <Badge tone={statusMeta.tone}>{timeStatusName(tm, status)}</Badge>
                ) : (
                    <span className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                        {tm('your_call')}
                    </span>
                )}
            </div>

            <span className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-fg tabular-nums">
                    {formatMinutes(perDay ? summary.dailyAverage : summary.minutes, tRoot)}
                </span>
                <span className="font-mono text-xs text-fg-faint">
                    {perDay
                        ? tm('per_day_suffix')
                        : `${tm('per_week_suffix')}${
                              daysLogged > 0 && daysLogged < 7
                                  ? tm('partial_days', { count: daysLogged })
                                  : ''
                          }`}
                </span>
            </span>

            <span
                className={cn(
                    'text-xs leading-snug',
                    band ? 'text-fg-secondary' : 'text-fg-muted'
                )}>
                {rangeText
                    ? `${rangeText} ${perDay ? tm('per_day') : tm('per_week')}`
                    : timeCategoryHint(tm, summary.category)}
            </span>

            <TimeSources sources={reference.sources} />
        </div>
    );
}
