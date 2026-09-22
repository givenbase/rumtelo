'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import type { TimeEntry, TimeTemplate } from '@rumtelo/contracts';
import { TimeDayKind } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button } from '@rumtelo/ui';
import { useApiError } from '@/app/_lib/api-error-messages';
import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { formatDayLabel, shiftDay, todayIso } from '@/app/_lib/week-key';
import { useAppShell } from '@/components/features/shell/app-shell-context';

import type { DayMinutes } from './day-shape';
import {
    dayKindName,
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
    const locale = useLocale();
    const t = useTranslations();
    const tc = useTranslations('features.energy.week.checkin');
    const ts = useTranslations('features.energy.week.shape');
    const apiError = useApiError();
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
    const dayName = isToday ? tc('today_word') : formatDayLabel(day, locale);
    const dayLabel = isToday ? t('features.energy.week.today') : formatDayLabel(day, locale);

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
                queryClient.invalidateQueries({ queryKey: apiQuery.coach.feed.key() }),
                queryClient.invalidateQueries({ queryKey: apiQuery.energy.dashboard.get.key() }),
            ]);
            setDraft(null);
            showToast(tc('toast_logged', { day: dayLabel }), 'success');
        },
        onError: (error: Error) => showToast(apiError(error), 'error'),
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
            ? tc('learned_note', {
                  count: template.learnedDays,
                  kind: dayKindName(ts, kind),
              })
            : null;

    return (
        <div className="grid gap-5">
            {/* ── Day nav ── */}
            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={tc('prev_day')}
                    onClick={() => changeDay(shiftDay(day, -1))}>
                    ←
                </Button>
                <span className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                    {dayLabel}
                </span>
                <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={tc('next_day')}
                    disabled={isToday}
                    onClick={() => changeDay(shiftDay(day, 1))}>
                    →
                </Button>
            </div>

            {adjusting ? (
                /* ── Adjust ── */
                <div className="grid gap-5">
                    <p className="text-lg font-medium text-fg">
                        {tc('adjust_question', { day: dayName })}
                    </p>
                    <ShapeEditor
                        idPrefix={`day-${day}`}
                        value={draft}
                        onChange={setDraft}
                        reference={defaults}
                        referenceLabel={tc('reference_typical', { kind: dayKindName(ts, kind) })}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <span className="font-mono text-xs text-fg-muted">
                            {describeShape(draft, ts)}
                        </span>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={busy}
                                onClick={() => setDraft(null)}>
                                {t('ui.button.actions.cancel')}
                            </Button>
                            <Button
                                type="button"
                                disabled={busy || overDay(draft)}
                                onClick={() => saveMutation.mutate(draft)}>
                                {busy
                                    ? t('ui.form.saving')
                                    : logged
                                      ? tc('update_day')
                                      : tc('log_day')}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : logged ? (
                /* ── Already logged ── */
                <div className="grid gap-3">
                    <p className="text-lg font-medium text-fg">
                        {isToday
                            ? tc('logged_title_today')
                            : tc('logged_title_day', { day: formatDayLabel(day, locale) })}
                    </p>
                    <p className="font-mono text-sm text-fg-secondary">
                        {describeShape(logged, ts)}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => setDraft(logged)}>
                            {tc('adjust')}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" onClick={onEditEverything}>
                            {tc('edit_every_category')}
                        </Button>
                    </div>
                </div>
            ) : (
                /* ── The one question ── */
                <div className="grid gap-4">
                    <div className="grid gap-1">
                        <p className="text-lg font-medium text-fg">
                            {tc('typical_question', {
                                day: dayName,
                                kind: dayKindName(ts, kind),
                            })}
                        </p>
                        <p className="font-mono text-sm text-fg-secondary">
                            {describeShape(defaults, ts)}
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
                            {busy ? tc('logging') : tc('yes_log')}
                        </Button>
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={busy || !template}
                            onClick={() => setDraft(defaults)}>
                            {tc('mostly_adjust')}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => setKindOverride(otherKind)}>
                            {tc('other_kind', { kind: dayKindName(ts, otherKind) })}
                        </Button>
                    </div>
                    <div className="flex flex-wrap gap-4 font-mono text-xs text-fg-muted">
                        <button type="button" onClick={onEditEverything} className="hover:text-fg">
                            {tc('edit_every_category')}
                        </button>
                        <button type="button" onClick={onEditWeek} className="hover:text-fg">
                            {tc('change_typical_week')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
