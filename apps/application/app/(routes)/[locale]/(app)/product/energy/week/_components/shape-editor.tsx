'use client';

import { useState } from 'react';

import { TimeCategory } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import { formatMinutes } from '@/app/_lib/time-meta';

import type { DayMinutes, ShapeQuestion } from './day-shape';
import { ANCHORS, FREE_SPLIT, MORE, freeAssigned, freeRemainder } from './day-shape';
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
    referenceLabel = 'on a workday',
}: Props) {
    const dayOff = variant === 'dayOff';
    const [splitOpen, setSplitOpen] = useState(() => dayOff || freeAssigned(value) > 0);
    const [moreOpen, setMoreOpen] = useState(false);

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
                        ? `${referenceLabel}: ${referenceMinutes === 0 ? 'none' : formatMinutes(referenceMinutes)}`
                        : undefined
                }
            />
        );
    };

    const anchors = ANCHORS.filter(
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
                <>That is {formatMinutes(-remainder)} more than a day has.</>
            ) : (
                <>
                    That leaves{' '}
                    <span className="font-mono font-semibold tabular-nums">
                        {formatMinutes(remainder)}
                    </span>{' '}
                    you steer
                    {assigned > 0 ? (
                        unsplit < 0 ? (
                            <> — you split {formatMinutes(-unsplit)} more than that.</>
                        ) : (
                            <>
                                {' '}
                                · {formatMinutes(assigned)} split
                                {unsplit > 0 ? `, ${formatMinutes(unsplit)} unspecified` : ''}
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
                {dayOff
                    ? 'Where does that free time usually go?'
                    : 'Roughly how does that free time go?'}{' '}
                <span className="text-fg-faint">optional</span>
            </button>
            {splitOpen ? (
                <div className="grid gap-4 border-l border-line pl-4">{FREE_SPLIT.map(chips)}</div>
            ) : null}
        </div>
    );

    const more = (
        <div className="grid gap-3">
            <button
                type="button"
                onClick={() => setMoreOpen(open => !open)}
                className="justify-self-start font-mono text-xs text-fg-muted hover:text-fg">
                {moreOpen ? '▾' : '▸'} More — eating & hygiene, study, hobbies, volunteering
            </button>
            {moreOpen ? (
                <div className="grid gap-4 border-l border-line pl-4">{MORE.map(chips)}</div>
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
                        What changes from a workday
                    </p>
                    <div className="grid gap-4">{anchors.map(chips)}</div>
                </div>
                {more}
            </div>
        );
    }

    return (
        <div className="grid gap-5">
            <div className="grid gap-4">{anchors.map(chips)}</div>
            {remainderBox}
            {split}
            {more}
        </div>
    );
}
