'use client';

import { Icon } from '../../display/Icon';
import { useMemo, useState } from 'react';

import { cn } from '@rumtelo/utils';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../Select';

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

/** Monday-first weekday short labels (Mon=0 … Sun=6). */
function weekdayShortNames(locale: string): readonly string[] {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    const monday = new Date(2025, 0, 6);
    return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return formatter.format(date);
    });
}

function monthShortNames(locale: string): readonly string[] {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });
    return Array.from({ length: 12 }, (_, monthIndex) =>
        formatter.format(new Date(2025, monthIndex, 1))
    );
}

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

export function formatDisplayDate(iso: string, locale?: string): string {
    const date = parseIsoDate(iso);
    return date.toLocaleDateString(locale, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
}

type DatePart = 'day' | 'month' | 'year';

/** Locale-aware day/month/year order for typed input (nl → dmy, en-US → mdy). */
export function dateInputOrder(locale?: string): DatePart[] {
    const tag = locale?.trim() || 'en-GB';
    try {
        const parts = new Intl.DateTimeFormat(tag, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).formatToParts(new Date(2020, 0, 2));
        const order = parts
            .map(part => part.type)
            .filter(
                (type): type is DatePart => type === 'day' || type === 'month' || type === 'year'
            );
        if (order.length === 3) return order;
    } catch {
        // fall through
    }
    return ['day', 'month', 'year'];
}

/** Typed-field placeholder — e.g. `dd-mm-yyyy` / `mm-dd-yyyy`. */
export function dateInputPlaceholder(locale?: string): string {
    return dateInputOrder(locale)
        .map(part => (part === 'year' ? 'yyyy' : part === 'month' ? 'mm' : 'dd'))
        .join('-');
}

/** Format ISO as a typed value (`01-01-1990`) matching the locale order. */
export function formatInputDate(iso: string, locale?: string): string {
    const date = parseIsoDate(iso);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear());
    const values: Record<DatePart, string> = { day, month, year };
    return dateInputOrder(locale)
        .map(part => values[part])
        .join('-');
}

function isValidYmd(year: number, month: number, day: number): boolean {
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return false;
    if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

/**
 * Parse a typed date into ISO `YYYY-MM-DD`.
 * Accepts ISO, and locale-ordered digits with `-` `/` `.` separators (`01-01-1990`).
 */
export function parseInputDate(raw: string, locale?: string): string | null {
    const text = raw.trim();
    if (!text) return null;

    const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
    if (isoMatch) {
        const year = Number(isoMatch[1]);
        const month = Number(isoMatch[2]);
        const day = Number(isoMatch[3]);
        return isValidYmd(year, month, day) ? toIsoDate(new Date(year, month - 1, day)) : null;
    }

    const digits = text.split(/[/.\-\s]+/).filter(Boolean);
    if (digits.length !== 3) return null;

    const order = dateInputOrder(locale);
    const map: Partial<Record<DatePart, number>> = {};
    for (let index = 0; index < 3; index++) {
        const part = order[index];
        const chunk = digits[index];
        if (!part || !chunk || !/^\d{1,4}$/.test(chunk)) return null;
        map[part] = Number(chunk);
    }

    const year = map.year;
    const month = map.month;
    const day = map.day;
    if (year === undefined || month === undefined || day === undefined) return null;
    return isValidYmd(year, month, day) ? toIsoDate(new Date(year, month - 1, day)) : null;
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
    const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const boundTime = new Date(bound.getFullYear(), bound.getMonth(), bound.getDate()).getTime();
    return dateTime < boundTime;
}

function isAfterDay(date: Date, bound: Date): boolean {
    const dateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const boundTime = new Date(bound.getFullYear(), bound.getMonth(), bound.getDate()).getTime();
    return dateTime > boundTime;
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
    'h-8 max-w-[5.5rem] rounded-lg border-transparent bg-transparent px-2 font-mono text-[11px] font-semibold tracking-[0.12em] text-fg uppercase shadow-none hover:bg-accent-soft/70 hover:text-accent focus-visible:border-accent/40 focus-visible:ring-1 focus-visible:ring-accent/30';

export type CalendarProps = {
    value?: string | null;
    onSelect?: (iso: string) => void;
    min?: string | null;
    max?: string | null;
    className?: string;
    /** BCP 47 locale — localizes weekday/month captions via Intl when set. */
    locale?: string;
    /** Optional a11y labels — English defaults when omitted. */
    labels?: {
        previousMonth?: string;
        nextMonth?: string;
        month?: string;
        year?: string;
        today?: string;
        pickADay?: string;
    };
};

/** Branded month grid — use instead of native `type="date"` pickers. */
export function Calendar({ value, onSelect, min, max, className, locale, labels }: CalendarProps) {
    const previousMonthLabel = labels?.previousMonth ?? 'Previous month';
    const nextMonthLabel = labels?.nextMonth ?? 'Next month';
    const monthLabel = labels?.month ?? 'Month';
    const yearLabel = labels?.year ?? 'Year';
    const todayLabel = labels?.today ?? 'Today';
    const pickADayLabel = labels?.pickADay ?? 'Pick a day';
    const weekdays = useMemo(() => (locale ? weekdayShortNames(locale) : WEEKDAYS), [locale]);
    const monthsShort = useMemo(() => (locale ? monthShortNames(locale) : MONTHS_SHORT), [locale]);
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
        const year = visibleMonth.getFullYear();
        const month = visibleMonth.getMonth();
        const cells: Array<{ date: Date | null; key: string }> = [];

        for (let slot = 0; slot < lead; slot++) {
            const pad = new Date(first);
            pad.setDate(pad.getDate() - (lead - slot));
            cells.push({ date: null, key: `pad-${toIsoDate(pad)}` });
        }

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            cells.push({ date, key: toIsoDate(date) });
        }

        const lastDay = new Date(year, month, daysInMonth);
        let trail = 0;
        while (cells.length % 7 !== 0) {
            trail++;
            const pad = new Date(lastDay);
            pad.setDate(pad.getDate() + trail);
            cells.push({ date: null, key: `pad-${toIsoDate(pad)}` });
        }

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

    const navBtnClass =
        'grid size-8 shrink-0 place-items-center rounded-lg text-fg-muted transition-colors ' +
        'hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-35';

    return (
        <div
            className={cn(
                'w-full max-w-[19rem] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] ring-1 ring-black/3',
                className
            )}
            data-slot="calendar">
            <div className="border-b border-line/80 bg-gradient-to-b from-accent-soft/40 to-transparent px-3 pt-3 pb-2.5">
                <div className="flex items-center justify-between gap-1">
                    <button
                        type="button"
                        aria-label={previousMonthLabel}
                        disabled={!canGoPrev}
                        onClick={() => setVisibleMonth(current => addMonths(current, -1))}
                        className={navBtnClass}>
                        <Icon name="chevron-left" size="md" />
                    </button>

                    <div className="flex min-w-0 flex-1 items-center justify-center gap-0.5">
                        <Select
                            value={String(visibleMonth.getMonth())}
                            onValueChange={next =>
                                jumpTo(visibleMonth.getFullYear(), Number(next))
                            }>
                            <SelectTrigger
                                size="sm"
                                aria-label={monthLabel}
                                className={cn(captionSelectClass, 'min-w-0')}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                                position="popper"
                                className="z-[60] max-h-64 rounded-xl border-line bg-surface text-fg shadow-lg">
                                {monthsShort.map((label, monthIndex) => (
                                    <SelectItem
                                        key={label}
                                        value={String(monthIndex)}
                                        disabled={
                                            !monthSelectable(
                                                visibleMonth.getFullYear(),
                                                monthIndex,
                                                minDate,
                                                maxDate
                                            )
                                        }
                                        className="font-mono text-[11px] tracking-wide uppercase">
                                        {label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select
                            value={String(visibleMonth.getFullYear())}
                            onValueChange={next => jumpTo(Number(next), visibleMonth.getMonth())}>
                            <SelectTrigger
                                size="sm"
                                aria-label={yearLabel}
                                className={captionSelectClass}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent
                                position="popper"
                                className="z-[60] max-h-64 rounded-xl border-line bg-surface text-fg shadow-lg">
                                {years.map(year => (
                                    <SelectItem
                                        key={year}
                                        value={String(year)}
                                        className="font-mono text-[11px] tracking-wide uppercase tabular-nums">
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <button
                        type="button"
                        aria-label={nextMonthLabel}
                        disabled={!canGoNext}
                        onClick={() => setVisibleMonth(current => addMonths(current, 1))}
                        className={navBtnClass}>
                        <Icon name="chevron-right" size="md" />
                    </button>
                </div>
            </div>

            <div className="px-3 pt-2.5 pb-3">
                <div className="mb-1 grid grid-cols-7 gap-0.5">
                    {weekdays.map(day => (
                        <div
                            key={day}
                            className="grid h-7 place-items-center font-mono text-[10px] font-medium tracking-[0.14em] text-fg-faint uppercase">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-0.5">
                    {days.map(cell => {
                        if (!cell.date) {
                            return <div key={cell.key} className="h-9" />;
                        }
                        const date = cell.date;
                        const iso = cell.key;
                        const dayDisabled =
                            (minDate !== null && isBeforeDay(date, minDate)) ||
                            (maxDate !== null && isAfterDay(date, maxDate));
                        const isSelected = selected ? sameDay(date, selected) : false;
                        const isToday = sameDay(date, today);

                        return (
                            <button
                                key={iso}
                                type="button"
                                disabled={dayDisabled}
                                aria-label={formatDisplayDate(iso, locale)}
                                aria-pressed={isSelected}
                                onClick={() => onSelect?.(iso)}
                                className={cn(
                                    'grid h-9 place-items-center rounded-xl font-mono text-sm tabular-nums transition-[color,background-color,box-shadow,transform] duration-150',
                                    dayDisabled && 'pointer-events-none text-fg-faint/40',
                                    !dayDisabled &&
                                        !isSelected &&
                                        'text-fg hover:bg-accent-soft hover:text-accent active:scale-[0.96]',
                                    isToday &&
                                        !isSelected &&
                                        'bg-accent-soft/55 font-medium text-accent ring-1 ring-accent/25 ring-inset',
                                    isSelected &&
                                        'bg-accent font-semibold text-on-accent shadow-[0_8px_18px_-10px_color-mix(in_oklab,var(--color-accent)_80%,transparent)]'
                                )}>
                                {date.getDate()}
                            </button>
                        );
                    })}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line/70 pt-2.5">
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
                        className="rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase transition-colors hover:bg-accent-soft disabled:pointer-events-none disabled:opacity-40">
                        {todayLabel}
                    </button>
                    {selected ? (
                        <span className="font-mono text-[11px] text-fg-muted tabular-nums">
                            {formatDisplayDate(toIsoDate(selected), locale)}
                        </span>
                    ) : (
                        <span className="font-mono text-[11px] tracking-wide text-fg-faint">
                            {pickADayLabel}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
