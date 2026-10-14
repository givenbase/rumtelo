'use client';

import { useTranslations } from '@rumtelo/i18n';

import type { SeatCapacityState } from '@/components/features/shell/use-seat-capacity';

/**
 * Live seat usage: `2 / 3` plus writable/viewer breakdown.
 * Upgrade / add-on CTAs stay with the invite form — seats are not a simple create button.
 */
export function SeatCapacitySummary({ capacity }: { capacity: SeatCapacityState }) {
    const t = useTranslations();
    const { caps, occupiedSeats, writableCount, viewerCount } = capacity;
    const maxMembers = caps.maxMembers;
    const maxWritable = caps.maxWritable;
    const maxViewer = caps.maxViewer;

    return (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
            {maxMembers !== null ? (
                <span
                    className="font-mono text-xs font-medium tracking-wide text-fg-faint tabular-nums"
                    aria-label={t('pages.settings.panels.household.capacity_usage_aria', {
                        used: occupiedSeats,
                        max: maxMembers,
                    })}>
                    {occupiedSeats} / {maxMembers}
                </span>
            ) : (
                <span className="font-mono text-xs font-medium tracking-wide text-fg-faint tabular-nums">
                    {occupiedSeats}
                </span>
            )}
            {maxWritable !== null && maxViewer !== null ? (
                <span className="text-xs text-fg-faint">
                    {t('pages.settings.panels.household.capacity_breakdown', {
                        writableUsed: writableCount,
                        writableMax: maxWritable,
                        viewerUsed: viewerCount,
                        viewerMax: maxViewer,
                    })}
                </span>
            ) : null}
        </div>
    );
}
