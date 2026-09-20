'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { TimeEntry, TimeTemplate } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { formatDayLabel, shiftDay, todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import { WEEKDAY_SHORT, finalizeDay, templateForDay } from './day-shape';

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
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const today = todayIso();
    const loggedDays = new Set(entries.map(entry => entry.on));

    const typicalMutation = useMutation({
        mutationFn: (day: string) => {
            const owner = templateForDay(templates, day);
            if (!owner) throw new Error('Set up your typical week first');
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
            showToast(`${formatDayLabel(day)} logged as typical`, 'success');
        },
        onError: (error: Error) => showToast(error.message || 'Could not log', 'error'),
    });

    const days = WEEKDAY_SHORT.map((name, index) => {
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
                                aria-label={`${formatDayLabel(day.iso)}${day.logged ? ', logged' : day.future ? '' : ', not logged'}`}
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
                                    typical
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
                    {missing} {missing === 1 ? 'day' : 'days'} not logged — tap{' '}
                    <span className="text-fg">typical</span> under a day to fill it in one go.
                </p>
            ) : null}
        </div>
    );
}
