'use client';

import { useState } from 'react';

import { TimeCategory } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';

import { formatMinutes } from '@/app/_lib/time-meta';

import type { DayMinutes, ShapeQuestion } from './day-shape';
import { buildAnchors, buildFreeSplit, buildMore, freeAssigned, freeRemainder } from './day-shape';
import { HourChips } from './hour-chips';

type Props = {
    idPrefix: string;
    value: DayMinutes;
    onChange: (next: DayMinutes) => void;
    /**
     * `workday` asks the anchors first and folds the free time. `dayOff` skips work,
     * asks in day-off words and leads with the free time — that is what a day off is.
     */
    variant?: 'workday' | 'dayOff';
    /** Shown as "on a workday: 6h" next to each question so the second screen reads as "what changes?". */
    reference?: DayMinutes;
    /** Prefix for the reference hint. */
    referenceLabel?: string;
};

/**
 * Five anchors, a live remainder, and two folded layers. This is the whole diary
 * for most days; the thirteen-field form stays one click away for the rest.
 */
export function ShapeEditor({
    idPrefix,
    value,
    onChange,
    variant = 'workday',
    reference,
    referenceLabel,
}: Props) {
    const tRoot = useTranslations();
    const ts = useTranslations('features.energy.week.shape');
    const dayOff = variant === 'dayOff';
    const [splitOpen, setSplitOpen] = useState(() => dayOff || freeAssigned(value) > 0);
    const [moreOpen, setMoreOpen] = useState(false);

    const anchors = buildAnchors(ts);
    const freeSplit = buildFreeSplit(ts);
    const more = buildMore(ts);
    const hintLabel = referenceLabel ?? ts('editor.reference_workday');

    const remainder = freeRemainder(value);
    const assigned = freeAssigned(value);
    const unsplit = remainder - assigned;
    const over = remainder < 0 || unsplit < 0;

    const set = (category: TimeCategory) => (minutes: number) =>
        onChange({ ...value, [category]: minutes });

    const chips = (question: ShapeQuestion) => {
        const referenceMinutes = reference?.[question.category];
        return (
            <HourChips
                key={question.category}
                id={`${idPrefix}-${question.category.toLowerCase()}`}
                question={
                    dayOff ? (question.dayOffQuestion ?? question.question) : question.question
                }
                options={question.options}
                value={value[question.category] ?? 0}
                onChange={set(question.category)}
                hint={
                    referenceMinutes !== undefined
                        ? `${hintLabel}: ${referenceMinutes === 0 ? ts('editor.hint_none') : formatMinutes(referenceMinutes, tRoot)}`
                        : undefined
                }
            />
        );
    };

    const visibleAnchors = anchors.filter(
        question => !(dayOff && question.category === TimeCategory.PAID_WORK)
    );

    const remainderBox = (
        <div
            className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                over
                    ? 'border-danger/40 bg-danger/5 text-danger'
                    : 'border-accent/30 bg-accent/5 text-fg'
            )}>
            {remainder < 0 ? (
                <>{ts('editor.over_day', { time: formatMinutes(-remainder, tRoot) })}</>
            ) : (
                <>
                    {ts('editor.remainder_leaves', { time: formatMinutes(remainder, tRoot) })}
                    {assigned > 0 ? (
                        unsplit < 0 ? (
                            <>{ts('editor.split_over', { time: formatMinutes(-unsplit, tRoot) })}</>
                        ) : (
                            <>
                                {ts('editor.split_assigned', {
                                    assigned: formatMinutes(assigned, tRoot),
                                })}
                                {unsplit > 0
                                    ? ts('editor.split_unspecified', {
                                          time: formatMinutes(unsplit, tRoot),
                                      })
                                    : ''}
                            </>
                        )
                    ) : (
                        '.'
                    )}
                </>
            )}
        </div>
    );

    const split = (
        <div className="grid gap-3">
            <button
                type="button"
                onClick={() => setSplitOpen(open => !open)}
                className="justify-self-start font-mono text-xs text-fg-muted hover:text-fg">
                {splitOpen ? '▾' : '▸'}{' '}
                {dayOff ? ts('editor.split_toggle_dayoff') : ts('editor.split_toggle_workday')}{' '}
                <span className="text-fg-faint">{ts('editor.optional')}</span>
            </button>
            {splitOpen ? (
                <div className="grid gap-4 border-l border-line pl-4">{freeSplit.map(chips)}</div>
            ) : null}
        </div>
    );

    const moreSection = (
        <div className="grid gap-3">
            <button
                type="button"
                onClick={() => setMoreOpen(open => !open)}
                className="justify-self-start font-mono text-xs text-fg-muted hover:text-fg">
                {moreOpen ? '▾' : '▸'} {ts('editor.more_toggle')}
            </button>
            {moreOpen ? (
                <div className="grid gap-4 border-l border-line pl-4">{more.map(chips)}</div>
            ) : null}
        </div>
    );

    if (dayOff) {
        // A day off is mostly free time, so ask about that first; the anchors are corrections.
        return (
            <div className="grid gap-5">
                {remainderBox}
                {split}
                <div className="grid gap-3 border-t border-line pt-5">
                    <p className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                        {ts('editor.dayoff_section')}
                    </p>
                    <div className="grid gap-4">{visibleAnchors.map(chips)}</div>
                </div>
                {moreSection}
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="grid gap-4">{visibleAnchors.map(chips)}</div>
            {remainderBox}
            {split}
            {moreSection}
        </div>
    );
}
