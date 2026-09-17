'use client';

import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useMemo, useState } from 'react';

import { cn } from '@rumtelo/utils';

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const;

const MONTHS_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC day shifts). */
export function parseIsoDate(iso: string): Date {
    const parts = iso.split('-').map(Number);
    const year = parts[0] ?? 1970;
    const month = parts[1] ?? 1;
    const day = parts[2] ?? 1;
    return new Date(year, month - 1, day);
}

export function toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function formatDisplayDate(iso: string): string {
    const date = parseIsoDate(iso);
    return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

function startOfMonth(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
    return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function sameDay(left: Date, right: Date): boolean {
    return (
        left.getFullYear() === right.getFullYear() &&
        left.getMonth() === right.getMonth() &&
        left.getDate() === right.getDate()
    );
}

function isBeforeDay(date: Date, bound: Date): boolean {
    const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const b = new Date(bound.getFullYear(), bound.getMonth(), bound.getDate()).getTime();
    return a < b;
}

function isAfterDay(date: Date, bound: Date): boolean {
    const a = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const b = new Date(bound.getFullYear(), bound.getMonth(), bound.getDate()).getTime();
    return a > b;
}

/** Monday-first index: Mon=0 … Sun=6 */
function mondayIndex(date: Date): number {
    return (date.getDay() + 6) % 7;
}

function yearRange(minDate: Date | null, maxDate: Date | null, anchorYear: number): number[] {
    const start = minDate?.getFullYear() ?? anchorYear - 40;
    const end = maxDate?.getFullYear() ?? anchorYear + 10;
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const years: number[] = [];
    for (let year = from; year <= to; year++) years.push(year);
    return years;
}

function monthSelectable(
    year: number,
    monthIndex: number,
    minDate: Date | null,
    maxDate: Date | null
): boolean {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);
    if (minDate && isAfterDay(minDate, monthEnd)) return false;
    if (maxDate && isBeforeDay(maxDate, monthStart)) return false;
    return true;
}

const captionSelectClass =
    'h-8 max-w-[5.75rem] cursor-pointer appearance-none rounded-full border border-line bg-background px-2.5 pr-6 font-mono text-[11px] font-medium tracking-wide text-fg uppercase outline-none transition-colors hover:border-accent-hover focus:border-accent disabled:opacity-40';

export type CalendarProps = {
    value?: string | null;
    onSelect?: (iso: string) => void;
    min?: string | null;
    max?: string | null;
    className?: string;
};

/** Branded month grid — use instead of native `type="date"` pickers. */
export function Calendar({ value, onSelect, min, max, className }: CalendarProps) {
    const selected = value ? parseIsoDate(value) : null;
    const minDate = min ? parseIsoDate(min) : null;
    const maxDate = max ? parseIsoDate(max) : null;
    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const [visibleMonth, setVisibleMonth] = useState(() =>
        startOfMonth(selected ?? maxDate ?? today)
    );

    const years = useMemo(
        () => yearRange(minDate, maxDate, today.getFullYear()),
        [minDate, maxDate, today]
    );

    const days = useMemo(() => {
        const first = startOfMonth(visibleMonth);
        const lead = mondayIndex(first);
        const cells: Array<Date | null> = [];
        for (let i = 0; i < lead; i++) cells.push(null);
        const daysInMonth = new Date(
            visibleMonth.getFullYear(),
            visibleMonth.getMonth() + 1,
            0
        ).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            cells.push(new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day));
        }
        while (cells.length % 7 !== 0) cells.push(null);
        return cells;
    }, [visibleMonth]);

    const canGoPrev = !minDate || addMonths(visibleMonth, -1) >= startOfMonth(minDate);
    const canGoNext = !maxDate || addMonths(visibleMonth, 1) <= startOfMonth(maxDate);

    function jumpTo(year: number, monthIndex: number) {
        let next = new Date(year, monthIndex, 1);
        if (minDate && startOfMonth(next) < startOfMonth(minDate)) {
            next = startOfMonth(minDate);
        }
        if (maxDate && startOfMonth(next) > startOfMonth(maxDate)) {
            next = startOfMonth(maxDate);
        }
        setVisibleMonth(next);
    }

    return (
        <div
            className={cn(
                'w-full max-w-[18.5rem] rounded-xl border border-line bg-raised p-3 shadow-sm',
                className
            )}
            data-slot="calendar">
            <div className="mb-3 flex items-center justify-between gap-1.5">
                <button
                    type="button"
                    aria-label="Previous month"
                    disabled={!canGoPrev}
                    onClick={() => setVisibleMonth(current => addMonths(current, -1))}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent disabled:pointer-events-none disabled:opacity-40">
                    <ChevronLeftIcon className="size-4" />
                </button>

                <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
                    <label className="relative inline-flex min-w-0">
                        <span className="sr-only">Month</span>
                        <select
                            aria-label="Month"
                            className={cn(captionSelectClass, 'min-w-0 flex-1')}
                            value={visibleMonth.getMonth()}
                            onChange={event =>
                                jumpTo(visibleMonth.getFullYear(), Number(event.target.value))
                            }>
                            {MONTHS_SHORT.map((label, monthIndex) => (
                                <option
                                    key={label}
                                    value={monthIndex}
                                    disabled={
                                        !monthSelectable(
                                            visibleMonth.getFullYear(),
                                            monthIndex,
                                            minDate,
                                            maxDate
                                        )
                                    }>
                                    {label}
                                </option>
                            ))}
                        </select>
                        <span
                            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-fg-faint"
                            aria-hidden>
                            ▾
                        </span>
                    </label>
                    <label className="relative inline-flex">
                        <span className="sr-only">Year</span>
                        <select
                            aria-label="Year"
                            className={captionSelectClass}
                            value={visibleMonth.getFullYear()}
                            onChange={event =>
                                jumpTo(Number(event.target.value), visibleMonth.getMonth())
                            }>
                            {years.map(year => (
                                <option key={year} value={year}>
                                    {year}
                                </option>
                            ))}
                        </select>
                        <span
                            className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[8px] text-fg-faint"
                            aria-hidden>
                            ▾
                        </span>
                    </label>
                </div>

                <button
                    type="button"
                    aria-label="Next month"
                    disabled={!canGoNext}
                    onClick={() => setVisibleMonth(current => addMonths(current, 1))}
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-fg-muted transition-colors hover:border-accent-hover hover:text-accent disabled:pointer-events-none disabled:opacity-40">
                    <ChevronRightIcon className="size-4" />
                </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-0.5">
                {WEEKDAYS.map(day => (
                    <div
                        key={day}
                        className="grid h-8 place-items-center font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
                {days.map((date, index) => {
                    if (!date) {
                        return <div key={`empty-${index}`} className="h-9" />;
                    }
                    const iso = toIsoDate(date);
                    const disabled =
                        (minDate !== null && isBeforeDay(date, minDate)) ||
                        (maxDate !== null && isAfterDay(date, maxDate));
                    const isSelected = selected ? sameDay(date, selected) : false;
                    const isToday = sameDay(date, today);

                    return (
                        <button
                            key={iso}
                            type="button"
                            disabled={disabled}
                            aria-label={formatDisplayDate(iso)}
                            aria-pressed={isSelected}
                            onClick={() => onSelect?.(iso)}
                            className={cn(
                                'grid h-9 place-items-center rounded-full font-mono text-sm transition-colors',
                                disabled && 'pointer-events-none text-fg-faint/50',
                                !disabled &&
                                    !isSelected &&
                                    'text-fg hover:bg-accent-soft hover:text-accent',
                                isToday && !isSelected && 'ring-1 ring-accent/35',
                                isSelected && 'bg-accent font-semibold text-on-accent shadow-glow'
                            )}>
                            {date.getDate()}
                        </button>
                    );
                })}
            </div>

            <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5">
                <button
                    type="button"
                    disabled={
                        maxDate !== null && isAfterDay(today, maxDate)
                            ? true
                            : minDate !== null && isBeforeDay(today, minDate)
                    }
                    onClick={() => {
                        const iso = toIsoDate(today);
                        setVisibleMonth(startOfMonth(today));
                        onSelect?.(iso);
                    }}
                    className="font-mono text-[11px] tracking-wide text-accent uppercase hover:underline disabled:pointer-events-none disabled:opacity-40">
                    Today
                </button>
                {selected ? (
                    <span className="font-mono text-[11px] text-fg-muted">
                        {formatDisplayDate(toIsoDate(selected))}
                    </span>
                ) : (
                    <span className="font-mono text-[11px] text-fg-faint">Pick a day</span>
                )}
            </div>
        </div>
    );
}
