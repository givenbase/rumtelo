'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TimeEntry, TimeTemplate } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { formatDayLabel, shiftDay, todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import { finalizeDay, templateForDay, weekdayShort } from '../_utils/day-shape';

type Props = {
    householdId: string;
    templates: ReadonlyArray<TimeTemplate>;
    entries: ReadonlyArray<TimeEntry>;
    /** Monday of the visible week. */
    from: string;
    selected: string;
    onSelect: (iso: string) => void;
};

/**
 * Seven day chips. Past unlogged days get a one-tap "typical" so a missed week is
 * caught up in seconds; tapping a chip focuses that day in the check-in above.
 */
export function CatchUpRow({ householdId, templates, entries, from, selected, onSelect }: Props) {
    const locale = useLocale();
    const tc = useTranslations('features.energy.week.catch_up');
    const ts = useTranslations('features.energy.week.shape');
    const apiError = useApiError();
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const today = todayIso();
    const loggedDays = new Set(entries.map(entry => entry.on));

    const typicalMutation = useMutation({
        mutationFn: (day: string) => {
            const owner = templateForDay(templates, day);
            if (!owner) throw new Error(tc('setup_typical_week_first'));
            const full = finalizeDay(owner.defaults);
            return api.energy.time.create({
                householdId,
                on: day,
                entries: (Object.entries(full) as [keyof typeof full, number][]).map(
                    ([category, minutes]) => ({ category, minutes })
                ),
            });
        },
        onSuccess: async (_rows, day) => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.summary.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.list.key() }),
                queryClient.invalidateQueries({
                    queryKey: apiQuery.energy.timeTemplates.list.key(),
                }),
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.dashboard.get.key() }),
            ]);
            showToast(tc('toast_typical', { day: formatDayLabel(day, locale) }), 'success');
        },
        onError: (error: Error) => showToast(apiError(error), 'error'),
    });

    const days = weekdayShort(ts).map((name, index) => {
        const iso = shiftDay(from, index);
        return { name, iso, logged: loggedDays.has(iso), future: iso > today };
    });
    const missing = days.filter(day => !day.logged && !day.future).length;

    return (
        <div className="grid gap-2">
            <div className="grid grid-cols-7 gap-1.5">
                {days.map(day => {
                    const isSelected = day.iso === selected;
                    return (
                        <div key={day.iso} className="grid gap-1">
                            <button
                                type="button"
                                disabled={day.future}
                                aria-pressed={isSelected}
                                aria-label={`${formatDayLabel(day.iso, locale)}${
                                    day.logged
                                        ? tc('aria_logged')
                                        : day.future
                                          ? ''
                                          : tc('aria_not_logged')
                                }`}
                                onClick={() => onSelect(day.iso)}
                                className={cn(
                                    'grid h-12 place-items-center rounded-xl border font-mono text-xs transition-colors',
                                    isSelected
                                        ? 'border-accent bg-accent/10 text-fg'
                                        : 'border-line bg-raised text-fg-secondary hover:border-line-strong',
                                    day.future && 'opacity-40'
                                )}>
                                <span>{day.name}</span>
                                <span
                                    aria-hidden
                                    className={cn(
                                        'size-1.5 rounded-full',
                                        day.logged
                                            ? 'bg-success'
                                            : day.future
                                              ? 'bg-transparent'
                                              : 'bg-line-strong'
                                    )}
                                />
                            </button>
                            {!day.logged && !day.future && templates.length > 0 ? (
                                <button
                                    type="button"
                                    disabled={typicalMutation.isPending}
                                    onClick={() => typicalMutation.mutate(day.iso)}
                                    className="font-mono text-[10px] text-fg-muted hover:text-fg disabled:opacity-50">
                                    {tc('typical')}
                                </button>
                            ) : (
                                <span className="h-[15px]" />
                            )}
                        </div>
                    );
                })}
            </div>
            {missing > 0 ? (
                <p className="font-mono text-xs text-fg-muted">
                    {tc('missing_intro', {
                        count: missing,
                        unit: missing === 1 ? tc('missing_unit_one') : tc('missing_unit_many'),
                    })}{' '}
                    <span className="text-fg">{tc('typical')}</span> {tc('missing_outro')}
                </p>
            ) : null}
        </div>
    );
}
