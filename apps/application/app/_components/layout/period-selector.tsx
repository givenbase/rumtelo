'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@rumtelo/ui';
import { useTranslations } from '@rumtelo/i18n';
import { cn, describePeriodTravel } from '@rumtelo/utils';

import { formatPeriodTravelLabels } from '@/app/_lib/period-travel-i18n';
import { useAppShell, type Period } from '@/components/features/shell/app-shell-context';

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

function encode(period: Period): string {
    return `${period.year}-${String(period.month).padStart(2, '0')}`;
}

function decode(value: string): Period {
    const [ys, ms] = value.split('-');
    const year = Number(ys);
    const month = Number(ms);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    return { year, month };
}

function nowPeriod(): Period {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function shiftPeriod(period: Period, deltaMonths: number): Period {
    const date = new Date(period.year, period.month - 1 + deltaMonths, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

function isAfter(left: Period, right: Period): boolean {
    return left.year > right.year || (left.year === right.year && left.month > right.month);
}

function isBefore(left: Period, right: Period): boolean {
    return left.year < right.year || (left.year === right.year && left.month < right.month);
}

function labelShort(period: Period, locale: string): string {
    return `${monthShort(period, locale)} ${period.year}`;
}

/**
 * Budget-period month picker:
 * hero read-out, quick jumps, year nav, 3×4 month grid.
 */
export function PeriodSelector() {
    const t = useTranslations('pages.shell');
    const locale = useLocale();
    const { period, setPeriod } = useAppShell();
    const [open, setOpen] = useState(false);
    const [viewYear, setViewYear] = useState(period.year);

    const current = nowPeriod();
    const horizon = shiftPeriod(current, 12);
    const floor = shiftPeriod(current, -8 * 12);
    const value = encode(period);
    const thisMonth = encode(current);
    const lastMonth = encode(shiftPeriod(current, -1));
    const nextMonth = encode(shiftPeriod(current, 1));
    const travel = describePeriodTravel(period);
    const labels = formatPeriodTravelLabels(travel, t);

    function handleOpenChange(next: boolean) {
        setOpen(next);
        if (next) setViewYear(period.year);
    }

    function commit(next: Period) {
        if (isBefore(next, floor) || isAfter(next, horizon)) return;
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
                                    : 'border-accent/50 bg-accent-soft text-accent hover:border-accent')
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
                className="w-[min(100vw-2rem,19.5rem)] overflow-hidden rounded-xl border border-line bg-surface p-0 text-fg shadow-lg">
                <div
                    className={cn(
                        'relative overflow-hidden border-b border-line px-4 pt-4 pb-3.5',
                        travel.direction === 'past'
                            ? 'bg-linear-to-br from-amber-500/15 via-surface to-surface'
                            : 'bg-linear-to-br from-accent-soft via-surface to-surface'
                    )}>
                    <span
                        className={cn(
                            'pointer-events-none absolute inset-x-3 top-3 h-px',
                            travel.direction === 'past' ? 'bg-amber-500/40' : 'bg-accent/35'
                        )}
                        aria-hidden
                    />
                    <p className="text-[13px] text-fg-muted italic">
                        {travel.direction === 'current'
                            ? t('period_options.this_month')
                            : travel.direction === 'past'
                              ? t('period_looking_back')
                              : t('period_looking_ahead')}
                    </p>
                    <div className="mt-1.5 flex items-end gap-2.5">
                        <p className="font-display text-[34px] leading-none font-semibold tracking-tight text-fg">
                            {monthShort(period, locale)}
                        </p>
                        <div className="mb-0.5 min-w-0">
                            <p className="text-sm leading-tight font-medium text-fg">
                                {monthLong(period, locale)}
                            </p>
                            <p className="text-xs leading-tight text-fg-muted">
                                {period.year}
                                {travel.direction !== 'current' ? ` · ${labels.relativeLabel}` : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <div
                    className="flex flex-wrap items-center gap-1 border-b border-line px-3 py-2"
                    role="listbox"
                    aria-label={t('period_quick')}>
                    {(
                        [
                            { labelKey: 'period_options.this_month', key: thisMonth },
                            { labelKey: 'period_options.last_month', key: lastMonth },
                            { labelKey: 'period_options.next_month', key: nextMonth },
                        ] as const
                    ).map((option, index) => {
                        const selected = value === option.key;
                        return (
                            <span key={option.key} className="inline-flex items-center gap-1">
                                {index > 0 ? (
                                    <span className="text-fg-faint" aria-hidden>
                                        ·
                                    </span>
                                ) : null}
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    onClick={() => commitKey(option.key)}
                                    className={cn(
                                        'px-1.5 py-1 text-xs tracking-tight transition-colors',
                                        selected
                                            ? 'font-semibold text-accent'
                                            : 'text-fg-muted hover:text-fg'
                                    )}>
                                    {t(option.labelKey)}
                                </button>
                            </span>
                        );
                    })}
                </div>

                <div className="px-3 pt-2.5 pb-3">
                    <div className="mb-3 flex items-center gap-1">
                        <button
                            type="button"
                            aria-label={t('period_prev_year')}
                            disabled={viewYear <= minYear}
                            onPointerDown={event => event.preventDefault()}
                            onClick={() => setViewYear(previous => Math.max(minYear, previous - 1))}
                            className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-30">
                            ‹
                        </button>
                        <p className="flex-1 text-center text-sm font-medium tracking-tight text-fg">
                            {viewYear}
                        </p>
                        <button
                            type="button"
                            aria-label={t('period_next_year')}
                            disabled={viewYear >= maxYear}
                            onPointerDown={event => event.preventDefault()}
                            onClick={() => setViewYear(previous => Math.min(maxYear, previous + 1))}
                            className="inline-flex size-9 items-center justify-center rounded-md text-fg-muted transition-colors hover:bg-raised hover:text-fg disabled:opacity-30">
                            ›
                        </button>
                    </div>

                    <div
                        className="grid grid-cols-3 gap-1"
                        role="listbox"
                        aria-label={t('period_months')}>
                        {Array.from({ length: 12 }, (_, monthIndex) => {
                            const next: Period = { year: viewYear, month: monthIndex + 1 };
                            const key = encode(next);
                            const selected = value === key;
                            const isCurrent = thisMonth === key;
                            const disabled = isBefore(next, floor) || isAfter(next, horizon);
                            const label = monthShort(next, locale);
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    role="option"
                                    aria-selected={selected}
                                    disabled={disabled}
                                    onClick={() => commit(next)}
                                    className={cn(
                                        'h-10 rounded-md text-[13px] tracking-tight transition-colors',
                                        selected
                                            ? 'bg-accent font-medium text-on-accent'
                                            : disabled
                                              ? 'cursor-not-allowed text-fg-faint opacity-40'
                                              : isCurrent
                                                ? 'bg-raised font-medium text-fg hover:bg-accent-soft'
                                                : 'text-fg hover:bg-raised'
                                    )}>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
