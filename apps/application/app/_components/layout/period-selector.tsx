'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import {
    cn,
    currentWeekKey,
    currentYearMonth,
    describePeriodTravel,
    isYearMonthAfter,
    isYearMonthBefore,
    periodTravelBounds,
} from '@rumtelo/utils';

import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import {
    useHouseholdShell,
    type Period,
} from '@/components/features/shell/household-shell-context';

function monthShort(period: Period, locale: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'short' }).format(
        new Date(period.year, period.month - 1, 1)
    );
}

function monthLong(period: Period, locale: string): string {
    return new Intl.DateTimeFormat(locale, { month: 'long' }).format(
        new Date(period.year, period.month - 1, 1)
    );
}

/** Today's read-out: weekday + day number for the tile, ISO week, quarter, month progress. */
function todayParts(locale: string) {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return {
        weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(now),
        day: now.getDate(),
        week: Number(currentWeekKey(now).slice(-2)),
        quarter: Math.ceil((now.getMonth() + 1) / 3),
        daysLeft: daysInMonth - now.getDate(),
        monthPct: Math.round((now.getDate() / daysInMonth) * 100),
    };
}

function encode(period: Period): string {
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function decode(value: string): Period {
    const [ys, ms] = value.split('-');
    const year = Number(ys);
    const month = Number(ms);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        return currentYearMonth();
    }
    return { year, month };
}

function labelShort(period: Period, locale: string): string {
    return `${monthShort(period, locale)} ${period.year}`;
}

/**
 * Budget-period month picker:
 * selected month (with a jump back to this month), today's date / week / quarter,
 * year nav, and a month grid with one row per quarter.
 */
export function PeriodSelector() {
    const t = useTranslations('pages.shell');
    const locale = useLocale();
    const { period, setPeriod, householdCreatedAt } = useHouseholdShell();
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(period.year);

    const current = currentYearMonth();
    const { floor, horizon } = periodTravelBounds(householdCreatedAt);
    const value = encode(period);
    const thisMonth = encode(current);
    const travel = describePeriodTravel(period);
    const labels = formatPeriodTravelLabels(travel, t);
    const today = todayParts(locale);
    const selectedQuarter = Math.ceil(period.month / 3);

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next) setViewYear(period.year);
    }

    function commit(next: Period) {
        if (isYearMonthBefore(next, floor) || isYearMonthAfter(next, horizon)) return;
        setPeriod(next);
        setOpen(false);
    }

    function commitKey(key: string) {
        commit(decode(key));
    }

    const minYear = floor.year;
    const maxYear = horizon.year;

    return (
        <DropdownMenu open={open} onOpenChange={handleOpenChange} modal={false}>
            <div className="relative flex items-center gap-2">
                <span className="hidden font-mono text-[9.5px] font-medium tracking-[0.15em] text-fg-faint uppercase sm:inline">
                    {t('period')}
                </span>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={
                            travel.direction === 'current'
                                ? t('period_select')
                                : t('period_select_relative', { label: labels.relativeLabel })
                        }
                        aria-expanded={open}
                        className={cn(
                            'inline-flex h-8 max-w-56 items-center gap-1.5 rounded-full border px-3 font-mono text-[10.5px] font-medium tracking-wide whitespace-nowrap uppercase transition-colors',
                            travel.direction === 'past' &&
                                (open
                                    ? 'border-amber-600/50 bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/25 dark:text-amber-200'
                                    : 'border-amber-600/40 bg-amber-500/10 text-amber-900 hover:border-amber-600/60 dark:text-amber-200'),
                            travel.direction === 'future' &&
                                (open
                                    ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent/25'
                                    : 'border-accent/60 bg-accent-soft text-accent hover:border-accent'),
                            travel.direction === 'current' &&
                                (open
                                    ? 'border-accent bg-accent-soft text-accent ring-1 ring-accent/25'
                                    : 'border-accent bg-accent-soft text-accent hover:border-accent')
                        )}>
                        <span aria-hidden className="text-[11px] opacity-80">
                            {travel.direction === 'past'
                                ? '↩'
                                : travel.direction === 'future'
                                  ? '↪'
                                  : '◇'}
                        </span>
                        <span className="truncate">{labelShort(period, locale)}</span>
                        {travel.direction !== 'current' ? (
                            <span className="hidden truncate text-[9px] normal-case opacity-80 sm:inline">
                                · {labels.relativeLabel}
                            </span>
                        ) : null}
                        <span className="text-[9px] opacity-70" aria-hidden>
                            {open ? '▴' : '▾'}
                        </span>
                    </button>
                </DropdownMenuTrigger>
            </div>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="w-[min(100vw-2rem,19.5rem)] overflow-hidden rounded-2xl border border-line bg-surface p-0 text-fg shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)]">
                {/* Header: the selected month; off the current month, one button back to it. */}
                <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-1">
                    <p className="min-w-0 truncate text-base font-semibold text-fg first-letter:uppercase">
                        {monthLong(period, locale)} {period.year}
                    </p>
                    {travel.direction === 'current' ? (
                        <span className="shrink-0 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent">
                            {t('period_options.this_month')}
                        </span>
                    ) : (
                        <button
                            type="button"
                            onClick={() => commitKey(thisMonth)}
                            className="shrink-0 rounded-full border border-line px-2.5 py-1 text-xs font-medium text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent">
                            {travel.direction === 'past'
                                ? `${t('period_options.this_month')} ›`
                                : `‹ ${t('period_options.this_month')}`}
                        </button>
                    )}
                </div>
                {/* Today strip: a date tile, week + quarter chips and how far the month is. */}
                <div className="mx-3 mt-2 mb-1 flex items-center gap-3 rounded-2xl bg-raised p-2.5">
                    <div className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-accent text-on-accent">
                        <span className="text-[10px] leading-none font-medium tracking-wide uppercase opacity-80">
                            {today.weekday.replace('.', '')}
                        </span>
                        <span className="mt-0.5 text-xl leading-none font-semibold tabular-nums">
                            {today.day}
                        </span>
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold text-fg">
                                {t('period_today')}
                            </span>
                            <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-fg-muted ring-1 ring-line">
                                {t('period_week', { week: today.week })}
                            </span>
                            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                                {t('period_quarter', { quarter: today.quarter })}
                            </span>
                        </div>
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
                            <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${today.monthPct}%` }}
                            />
                        </div>
                        <p className="mt-1 truncate text-[11px] text-fg-muted">
                            {t('period_days_left', {
                                count: today.daysLeft,
                                month: monthLong(current, locale),
                            })}
                        </p>
                    </div>
                </div>

                <div className="mt-2 border-t border-line px-3 pt-2.5 pb-3">
                    <div className="mb-2 flex items-center justify-center gap-4">
                        <button
                            type="button"
                            aria-label={t('period_prev_year')}
                            disabled={viewYear <= minYear}
                            onPointerDown={event => event.preventDefault()}
                            onClick={() => setViewYear(previous => Math.max(minYear, previous - 1))}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-30">
                            ‹
                        </button>
                        <p className="min-w-12 text-center font-mono text-sm font-medium tracking-wide text-fg tabular-nums">
                            {viewYear}
                        </p>
                        <button
                            type="button"
                            aria-label={t('period_next_year')}
                            disabled={viewYear >= maxYear}
                            onPointerDown={event => event.preventDefault()}
                            onClick={() => setViewYear(previous => Math.min(maxYear, previous + 1))}
                            className="inline-flex size-8 items-center justify-center rounded-lg text-fg-muted transition-colors hover:bg-accent-soft hover:text-accent disabled:opacity-30">
                            ›
                        </button>
                    </div>

                    {/* One row per quarter: a small Q label, then its three months. */}
                    <div className="space-y-1" role="listbox" aria-label={t('period_months')}>
                        {[1, 2, 3, 4].map(quarter => (
                            <div
                                key={quarter}
                                role="group"
                                aria-label={t('period_quarter_label', { quarter })}
                                className="grid grid-cols-[1.75rem_repeat(3,minmax(0,1fr))] items-center gap-1">
                                <span
                                    aria-hidden
                                    className={cn(
                                        'font-mono text-[11px]',
                                        viewYear === period.year && quarter === selectedQuarter
                                            ? 'font-medium text-accent'
                                            : 'text-fg-faint'
                                    )}>
                                    {t('period_quarter', { quarter })}
                                </span>
                                {[0, 1, 2].map(offset => {
                                    const next: Period = {
                                        year: viewYear,
                                        month: (quarter - 1) * 3 + offset + 1,
                                    };
                                    const key = encode(next);
                                    const selected = value === key;
                                    const isCurrent = thisMonth === key;
                                    const disabled =
                                        isYearMonthBefore(next, floor) ||
                                        isYearMonthAfter(next, horizon);
                                    const label = monthShort(next, locale);
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            role="option"
                                            aria-selected={selected}
                                            aria-label={
                                                isCurrent
                                                    ? t('period_month_current', {
                                                          month: monthLong(next, locale),
                                                      })
                                                    : undefined
                                            }
                                            disabled={disabled}
                                            onClick={() => commit(next)}
                                            className={cn(
                                                'relative h-10 rounded-xl text-[13px] tabular-nums transition-colors',
                                                selected
                                                    ? 'bg-accent font-semibold text-on-accent'
                                                    : disabled
                                                      ? 'cursor-not-allowed text-fg-faint opacity-40'
                                                      : isCurrent
                                                        ? 'font-medium text-accent hover:bg-accent-soft'
                                                        : 'text-fg hover:bg-accent-soft hover:text-accent'
                                            )}>
                                            {label}
                                            {/* Today's month keeps a dot, also when another month is selected. */}
                                            {isCurrent ? (
                                                <span
                                                    aria-hidden
                                                    className={cn(
                                                        'absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full',
                                                        selected ? 'bg-on-accent' : 'bg-accent'
                                                    )}
                                                />
                                            ) : null}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
