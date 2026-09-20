'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { TimeEntry, TimeTemplate } from '@rumtelo/contracts';
import { TimeDayKind } from '@rumtelo/contracts';
import { Button } from '@rumtelo/ui';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { formatDayLabel, shiftDay, todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import type { DayMinutes } from './day-shape';
import {
    DAY_KIND_NAME,
    describeShape,
    finalizeDay,
    overDay,
    shapeFromMinutes,
    templateForDay,
} from './day-shape';
import { ShapeEditor } from './shape-editor';

type Props = {
    householdId: string;
    templates: ReadonlyArray<TimeTemplate>;
    /** This person's rows for the visible week. */
    entries: ReadonlyArray<TimeEntry>;
    day: string;
    onChangeDay: (iso: string) => void;
    onEditEverything: () => void;
    onEditWeek: () => void;
};

function loggedShape(entries: ReadonlyArray<TimeEntry>, day: string): DayMinutes | null {
    const rows = entries.filter(entry => entry.on === day);
    if (rows.length === 0) return null;
    return shapeFromMinutes(Object.fromEntries(rows.map(entry => [entry.category, entry.minutes])));
}

/**
 * "Was today a typical workday?" One tap logs the template; "mostly" opens the five
 * anchors prefilled; the full thirteen-field form stays a link away.
 */
export function DayCheckIn({
    householdId,
    templates,
    entries,
    day,
    onChangeDay,
    onEditEverything,
    onEditWeek,
}: Props) {
    const queryClient = useQueryClient();
    const { showToast } = useAppShell();

    const owner = templateForDay(templates, day);
    const [kindOverride, setKindOverride] = useState<TimeDayKind | null>(null);
    const kind = kindOverride ?? owner?.template.kind ?? TimeDayKind.WORKDAY;
    const template = templates.find(candidate => candidate.kind === kind) ?? owner?.template;
    const defaults: DayMinutes = template
        ? shapeFromMinutes(template.learned ?? template.minutes)
        : {};

    const logged = loggedShape(entries, day);
    const [draft, setDraft] = useState<DayMinutes | null>(null);
    const adjusting = draft !== null;

    const isToday = day === todayIso();
    const dayName = isToday ? 'today' : formatDayLabel(day);

    const saveMutation = useMutation({
        mutationFn: (shape: DayMinutes) => {
            const full = finalizeDay(shape);
            return api.energy.time.create({
                householdId,
                on: day,
                entries: (Object.entries(full) as [keyof typeof full, number][]).map(
                    ([category, minutes]) => ({ category, minutes })
                ),
            });
        },
        onSuccess: async () => {
            await Promise.all([
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.summary.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.time.list.key() }),
                queryClient.invalidateQueries({
                    queryKey: apiQuery.energy.timeTemplates.list.key(),
                }),
            ]);
            setDraft(null);
            showToast(`${isToday ? 'Today' : formatDayLabel(day)} logged`, 'success');
        },
        onError: (error: Error) => showToast(error.message || 'Could not log this day', 'error'),
    });

    const changeDay = (next: string) => {
        setDraft(null);
        setKindOverride(null);
        onChangeDay(next);
    };

    const otherKind = kind === TimeDayKind.WORKDAY ? TimeDayKind.DAY_OFF : TimeDayKind.WORKDAY;
    const busy = saveMutation.isPending;
    const learnedNote =
        template?.learned && template.learnedDays >= 3
            ? `Based on your last ${template.learnedDays} ${DAY_KIND_NAME[kind]}s`
            : null;

    return (
        <div className="grid gap-5">
            {/* ── Day nav ── */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Previous day"
                    onClick={() => changeDay(shiftDay(day, -1))}>
                    ←
                </Button>
                <span className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                    {isToday ? 'Today' : formatDayLabel(day)}
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label="Next day"
                    disabled={isToday}
                    onClick={() => changeDay(shiftDay(day, 1))}>
                    →
                </Button>
            </div>

            {adjusting ? (
                /* ── Adjust ── */
                <div className="grid gap-5">
                    <p className="text-lg font-medium text-fg">
                        What was different about {dayName}?
                    </p>
                    <ShapeEditor
                        idPrefix={`day-${day}`}
                        value={draft}
                        onChange={setDraft}
                        reference={defaults}
                        referenceLabel={`typical ${DAY_KIND_NAME[kind]}`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <span className="font-mono text-xs text-fg-muted">
                            {describeShape(draft)}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setDraft(null)}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                disabled={busy || overDay(draft)}
                                onClick={() => saveMutation.mutate(draft)}>
                                {busy ? 'Saving…' : logged ? 'Update day' : 'Log day'}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : logged ? (
                /* ── Already logged ── */
                <div className="grid gap-3">
                    <p className="text-lg font-medium text-fg">
                        {isToday ? 'Today is' : `${formatDayLabel(day)} was`} logged.
                    </p>
                    <p className="font-mono text-sm text-fg-secondary">{describeShape(logged)}</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setDraft(logged)}>
                            Adjust
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={onEditEverything}>
                            Edit every category
                        </Button>
                    </div>
                </div>
            ) : (
                /* ── The one question ── */
                <div className="grid gap-4">
                    <div className="grid gap-1">
                        <p className="text-lg font-medium text-fg">
                            Was {dayName} a typical {DAY_KIND_NAME[kind]}?
                        </p>
                        <p className="font-mono text-sm text-fg-secondary">
                            {describeShape(defaults)}
                        </p>
                        {learnedNote ? (
                            <p className="text-xs text-fg-faint">{learnedNote}</p>
                        ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            disabled={busy || !template}
                            onClick={() => saveMutation.mutate(defaults)}>
                            {busy ? 'Logging…' : 'Yes, log it'}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || !template}
                            onClick={() => setDraft(defaults)}>
                            Mostly — adjust
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setKindOverride(otherKind)}>
                            It was a {DAY_KIND_NAME[otherKind]}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 font-mono text-xs text-fg-muted">
                        <button type="button" onClick={onEditEverything} className="hover:text-fg">
                            Edit every category
                        </button>
                        <button type="button" onClick={onEditWeek} className="hover:text-fg">
                            Change my typical week
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
