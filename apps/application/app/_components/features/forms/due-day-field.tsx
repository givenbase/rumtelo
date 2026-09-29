'use client';

import { Cadence } from '@rumtelo/contracts';
import {
    cn,
    dueDayMaxForCadence,
    dueMonthMaxForCadence,
    normalizeDueDay,
    normalizeDueMonth,
} from '@rumtelo/utils';

import { FormControl, FormItem, FormLabel, FormMessage } from '@rumtelo/ui';

import { FormInput } from './form-input';

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const QUARTER_MONTHS = [1, 2, 3] as const;
const YEAR_MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

function ChipRow({
    options,
    selected,
    disabled,
    labelFor,
    onPick,
}: {
    options: readonly number[];
    selected: number | null;
    disabled?: boolean;
    labelFor: (value: number) => string;
    onPick: (value: number) => void;
}) {
    return (
        <div className="flex flex-wrap gap-1.5">
            {options.map(option => {
                const active = selected === option;
                return (
                    <button
                        key={option}
                        type="button"
                        disabled={disabled}
                        aria-pressed={active}
                        className={cn(
                            'rounded-xl border px-2.5 py-1.5 text-sm transition-colors',
                            active
                                ? 'border-accent bg-accent/15 text-accent'
                                : 'border-line bg-raised text-fg hover:border-accent/60',
                            disabled && 'pointer-events-none opacity-50'
                        )}
                        onClick={() => onPick(option)}>
                        {labelFor(option)}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Cadence-aware due timing:
 * - WEEKLY → ISO weekday chips (Mon=1 … Sun=7)
 * - QUARTERLY → month-of-quarter chips (1–3) + day of month
 * - YEARLY → calendar month chips (1–12) + day of month
 * - MONTHLY → day of month 1–31
 */
export function DueDayField({
    cadence,
    value,
    onChange,
    dueMonth,
    onDueMonthChange,
    disabled,
    label,
    weekdayLabel,
    quarterMonthLabel,
    calendarMonthLabel,
    monthOfPeriodLabel,
    placeholder = '1',
}: {
    cadence: Cadence | string;
    value: string;
    onChange: (next: string) => void;
    /** Month-of-quarter (1–3) or calendar month (1–12); ignored for W/M. */
    dueMonth?: string;
    onDueMonthChange?: (next: string) => void;
    disabled?: boolean;
    label: string;
    /** ISO weekday 1–7 → display label. */
    weekdayLabel: (day: number) => string;
    /** Quarter slot 1–3 → display label. */
    quarterMonthLabel?: (month: number) => string;
    /** Calendar month 1–12 → display label. */
    calendarMonthLabel?: (month: number) => string;
    /** Label above the month-of-period chips. */
    monthOfPeriodLabel?: string;
    placeholder?: string;
}) {
    const weekly = cadence === Cadence.WEEKLY;
    const quarterly = cadence === Cadence.QUARTERLY;
    const yearly = cadence === Cadence.YEARLY;
    const needsMonth = quarterly || yearly;
    const selectedDay = value.trim() ? Number(value) : null;
    const selectedMonth = dueMonth?.trim() ? Number(dueMonth) : null;

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            {weekly ? (
                <ChipRow
                    options={WEEKDAYS}
                    selected={selectedDay}
                    disabled={disabled}
                    labelFor={weekdayLabel}
                    onPick={day => onChange(String(day))}
                />
            ) : (
                <div className="grid gap-3">
                    {needsMonth && onDueMonthChange ? (
                        <div className="grid gap-1.5">
                            {monthOfPeriodLabel ? (
                                <span className="text-sm text-fg-muted">{monthOfPeriodLabel}</span>
                            ) : null}
                            <ChipRow
                                options={quarterly ? QUARTER_MONTHS : YEAR_MONTHS}
                                selected={selectedMonth}
                                disabled={disabled}
                                labelFor={month =>
                                    quarterly
                                        ? (quarterMonthLabel?.(month) ?? String(month))
                                        : (calendarMonthLabel?.(month) ?? String(month))
                                }
                                onPick={month => onDueMonthChange(String(month))}
                            />
                        </div>
                    ) : null}
                    <FormControl>
                        <FormInput
                            type="number"
                            min={1}
                            max={dueDayMaxForCadence(cadence)}
                            placeholder={placeholder}
                            disabled={disabled}
                            value={value}
                            onChange={event => onChange(event.target.value)}
                        />
                    </FormControl>
                </div>
            )}
            <FormMessage />
        </FormItem>
    );
}

/** Clear dueDay when it is invalid for the new cadence. */
export function clampDueDayInput(raw: string, cadence: Cadence | string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const normalized = normalizeDueDay(Number(trimmed), cadence);
    return normalized === null ? '' : String(normalized);
}

/** Clear dueMonth when it is invalid / unused for the new cadence. */
export function clampDueMonthInput(raw: string, cadence: Cadence | string): string {
    if (dueMonthMaxForCadence(cadence) === null) return '';
    const trimmed = raw.trim();
    if (!trimmed) return '';
    const normalized = normalizeDueMonth(Number(trimmed), cadence);
    return normalized === null ? '' : String(normalized);
}
