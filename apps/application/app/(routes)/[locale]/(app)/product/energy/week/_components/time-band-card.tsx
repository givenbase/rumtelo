import type { TimeCategorySummary } from '@rumtelo/contracts';
import { TIME_REFERENCE, TimeBandStatus, TimeKind } from '@rumtelo/contracts';
import { Badge } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    TIME_CATEGORY_META,
    TIME_KIND_META,
    TIME_STATUS_META,
    formatBandRange,
    formatMinutes,
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
    const meta = TIME_CATEGORY_META[summary.category];
    const reference = TIME_REFERENCE[summary.category];
    const kind = TIME_KIND_META[summary.kind];
    const band = reference.band;
    // Daily behaviours read as a daily figure; weekly accumulators (work, exercise) as a weekly total.
    const perDay = band ? band.perDay : summary.kind === TimeKind.PERSONAL;

    const rangeText = band
        ? [
              formatBandRange(band.targetLow, band.targetHigh, perDay),
              band.floor !== null
                  ? `floor ${formatBandRange(band.floor, null, perDay)?.replace('≥ ', '')}`
                  : null,
              band.ceiling !== null
                  ? `ceiling ${formatBandRange(null, band.ceiling, perDay)?.replace('≤ ', '')}`
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
                    {meta.name}
                </span>
                {band ? (
                    <Badge tone={statusMeta.tone}>{statusMeta.name}</Badge>
                ) : (
                    <span className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                        your call
                    </span>
                )}
            </div>

            <span className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-semibold text-fg tabular-nums">
                    {formatMinutes(perDay ? summary.dailyAverage : summary.minutes)}
                </span>
                <span className="font-mono text-xs text-fg-faint">
                    {perDay
                        ? '/ day'
                        : `/ week${daysLogged > 0 && daysLogged < 7 ? ` (${daysLogged}d)` : ''}`}
                </span>
            </span>

            <span
                className={cn(
                    'text-xs leading-snug',
                    band ? 'text-fg-secondary' : 'text-fg-muted'
                )}>
                {rangeText ? `${rangeText} ${perDay ? 'per day' : 'per week'}` : meta.hint}
            </span>

            <TimeSources sources={reference.sources} />
        </div>
    );
}
