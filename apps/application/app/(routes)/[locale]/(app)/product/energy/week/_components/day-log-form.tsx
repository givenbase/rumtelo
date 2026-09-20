'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import type { TimeEntry } from '@rumtelo/contracts';
import { TIME_CATEGORY_ORDER, TimeCategory } from '@rumtelo/contracts';
import { Button, Input, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { TIME_CATEGORY_META, formatMinutes } from '@/app/_lib/time-meta';
import { formatDayLabel, shiftDay, todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';

type HoursByCategory = Record<TimeCategory, string>;

const EMPTY_DAY: HoursByCategory = Object.fromEntries(
    Object.values(TimeCategory).map(category => [category, ''])
) as HoursByCategory;

/** Starting points, not norms — every value is editable before saving. */
const PRESETS: ReadonlyArray<{ name: string; hours: Partial<Record<TimeCategory, number>> }> = [
    {
        name: 'Workday',
        hours: {
            [TimeCategory.SLEEP]: 7.5,
            [TimeCategory.PERSONAL_CARE]: 1.5,
            [TimeCategory.PAID_WORK]: 8,
            [TimeCategory.TRAVEL]: 1,
            [TimeCategory.HOUSEHOLD_CARE]: 1,
            [TimeCategory.EXERCISE]: 0.5,
            [TimeCategory.SOCIAL]: 1,
            [TimeCategory.SCREEN]: 2,
            [TimeCategory.STILLNESS]: 0.25,
        },
    },
    {
        name: 'Weekend day',
        hours: {
            [TimeCategory.SLEEP]: 8.5,
            [TimeCategory.PERSONAL_CARE]: 1.5,
            [TimeCategory.HOUSEHOLD_CARE]: 2.5,
            [TimeCategory.FAMILY_CARE]: 1,
            [TimeCategory.EXERCISE]: 1,
            [TimeCategory.SOCIAL]: 3,
            [TimeCategory.HOBBIES]: 1.5,
            [TimeCategory.SCREEN]: 2,
            [TimeCategory.TRAVEL]: 0.5,
        },
    },
];

function toMinutes(hours: string): number {
    const value = Number(hours.replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.round(value * 60);
}

function fromEntries(entries: ReadonlyArray<TimeEntry>, on: string): HoursByCategory {
    const next = { ...EMPTY_DAY };
    for (const entry of entries) {
        if (entry.on !== on || entry.minutes === 0) continue;
        next[entry.category] = String(Math.round((entry.minutes / 60) * 100) / 100);
    }
    return next;
}

type Props = {
    householdId: string;
    /** Only this person's rows — used to prefill the chosen day. */
    entries: ReadonlyArray<TimeEntry>;
    /** Day to open on; the form owns navigation from there. */
    defaultOn?: string;
    onSaved?: (on: string) => void;
};

/**
 * The full diary: one day, every HETUS-derived bucket, in hours. The "edit every
 * category" path behind the one-question check-in. Saves every category in one
 * round-trip so the diary is the source of truth.
 */
export function DayLogForm({ householdId, entries, defaultOn, onSaved }: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();
    const [on, setOn] = useState(defaultOn ?? todayIso);
    // What the user typed on top of what was already logged for this day. Derived, not synced.
    const [overrides, setOverrides] = useState<Partial<HoursByCategory>>({});
    const dirty = Object.keys(overrides).length > 0;
    const hours = useMemo<HoursByCategory>(
        () => ({ ...fromEntries(entries, on), ...overrides }),
        [entries, on, overrides]
    );

    const totalMinutes = useMemo(
        () => Object.values(hours).reduce((total, value) => total + toMinutes(value), 0),
        [hours]
    );
    const overDay = totalMinutes > 1440;
    const hasExisting = entries.some(entry => entry.on === on);

    const saveMutation = useMutation({
        mutationFn: () =>
            api.energy.time.create({
                householdId,
                on,
                entries: Object.values(TimeCategory).map(category => ({
                    category,
                    minutes: toMinutes(hours[category]),
                })),
            }),
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.summary.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.list.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.dashboard.get.key() }),
            ]);
            setOverrides({});
            showToast(`${formatDayLabel(on)} saved`, 'success');
            onSaved?.(on);
        },
        onError: (error: Error) => {
            showToast(error.message || 'Could not save this day', 'error');
        },
    });

    const changeDay = (next: string) => {
        if (!next) return;
        setOverrides({});
        setOn(next);
    };

    const setHour = (category: TimeCategory, value: string) => {
        setOverrides(current => ({ ...current, [category]: value }));
    };

    const applyPreset = (preset: (typeof PRESETS)[number]) => {
        setOverrides({
            ...EMPTY_DAY,
            ...(Object.fromEntries(
                Object.entries(preset.hours).map(([category, value]) => [category, String(value)])
            ) as Partial<HoursByCategory>),
        });
    };

    return (
        <form
            className="grid gap-5"
            onSubmit={event => {
                event.preventDefault();
                if (!overDay) saveMutation.mutate();
            }}>
            {/* ── Day picker ── */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Previous day"
                        onClick={() => changeDay(shiftDay(on, -1))}>
                        ←
                    </Button>
                    <Input
                        type="date"
                        value={on}
                        max={todayIso()}
                        aria-label="Day to log"
                        onChange={event => changeDay(event.target.value)}
                        className="w-auto"
                    />
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Next day"
                        disabled={on >= todayIso()}
                        onClick={() => changeDay(shiftDay(on, 1))}>
                        →
                    </Button>
                    {hasExisting ? (
                        <span className="font-mono text-xs text-fg-muted">logged · editing</span>
                    ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-fg-faint uppercase">Start from</span>
                    {PRESETS.map(preset => (
                        <Button
                            key={preset.name}
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => applyPreset(preset)}>
                            {preset.name}
                        </Button>
                    ))}
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setOverrides({ ...EMPTY_DAY })}>
                        Clear
                    </Button>
                </div>
            </div>

            {/* ── Hour inputs ── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {TIME_CATEGORY_ORDER.map(category => {
                    const meta = TIME_CATEGORY_META[category];
                    const id = `time-${category.toLowerCase()}`;
                    return (
                        <label
                            key={category}
                            htmlFor={id}
                            className="grid gap-1.5 rounded-xl border border-line bg-raised p-3">
                            <span className="flex items-center gap-2 text-sm font-medium text-fg">
                                <span aria-hidden>{meta.icon}</span>
                                {meta.name}
                            </span>
                            <span className="flex items-center gap-2">
                                <Input
                                    id={id}
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    max={24}
                                    step={0.25}
                                    placeholder="0"
                                    value={hours[category]}
                                    onChange={event => setHour(category, event.target.value)}
                                    className="w-full"
                                />
                                <span className="font-mono text-xs text-fg-faint">h</span>
                            </span>
                            <span className="text-xs leading-snug text-fg-muted">{meta.hint}</span>
                        </label>
                    );
                })}
            </div>

            {/* ── Total + save ── */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Typography
                    as="p"
                    size="sm"
                    className={cn(overDay ? 'text-danger' : 'text-fg-muted')}>
                    <span className="font-mono font-semibold text-fg tabular-nums">
                        {formatMinutes(totalMinutes)}
                    </span>{' '}
                    of 24h accounted for
                    {overDay
                        ? ' — a day only has 24 hours'
                        : totalMinutes > 0 && totalMinutes < 1440
                          ? ` · ${formatMinutes(1440 - totalMinutes)} unlogged`
                          : ''}
                </Typography>
                <Button type="submit" disabled={overDay || saveMutation.isPending || !dirty}>
                    {saveMutation.isPending ? 'Saving…' : hasExisting ? 'Update day' : 'Save day'}
                </Button>
            </div>
        </form>
    );
}
