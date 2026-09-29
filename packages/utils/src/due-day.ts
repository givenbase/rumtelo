import { Cadence } from '@rumtelo/contracts';

/**
 * ISO weekday: Monday = 1 … Sunday = 7 (matches ISO-8601 / Temporal).
 * Stored in `dueDay` when cadence is WEEKLY.
 */
export function isoWeekday(date: Date): number {
    const day = date.getDay();
    return day === 0 ? 7 : day;
}

/** Max valid `dueDay` for a cadence — weekday 1–7 vs day-of-month 1–31. */
export function dueDayMaxForCadence(cadence: Cadence | string | null | undefined): number {
    return cadence === Cadence.WEEKLY ? 7 : 31;
}

/**
 * Clamp / validate a dueDay for the given cadence.
 * WEEKLY → ISO weekday 1–7; otherwise day of month 1–31. Invalid → null.
 */
export function normalizeDueDay(
    raw: number | null | undefined,
    cadence: Cadence | string | null | undefined
): number | null {
    if (raw === null || raw === undefined || !Number.isFinite(raw)) return null;
    const day = Math.trunc(raw);
    const max = dueDayMaxForCadence(cadence);
    if (day < 1 || day > max) return null;
    return day;
}

/** Month-of-quarter (1–3) or calendar month (1–12) max for cadence; null if unused. */
export function dueMonthMaxForCadence(cadence: Cadence | string | null | undefined): number | null {
    if (cadence === Cadence.QUARTERLY) return 3;
    if (cadence === Cadence.YEARLY) return 12;
    return null;
}

/**
 * Clamp / validate dueMonth for Q/Y. WEEKLY / MONTHLY → always null.
 * Invalid → null.
 */
export function normalizeDueMonth(
    raw: number | null | undefined,
    cadence: Cadence | string | null | undefined
): number | null {
    const max = dueMonthMaxForCadence(cadence);
    if (max === null) return null;
    if (raw === null || raw === undefined || !Number.isFinite(raw)) return null;
    const month = Math.trunc(raw);
    if (month < 1 || month > max) return null;
    return month;
}

/** 1–3 for Jan…Mar / Apr…Jun / Jul…Sep / Oct…Dec. */
export function monthInQuarter(calendarMonth: number): number {
    return ((calendarMonth - 1) % 3) + 1;
}

/**
 * Is this calendar month a charge month for the cadence + dueMonth?
 * WEEKLY / MONTHLY → every month. Q/Y without dueMonth → never (avoid false overdue).
 */
export function isChargeMonth(
    cadence: Cadence | string | null | undefined,
    dueMonth: number | null | undefined,
    calendarMonth: number
): boolean {
    if (cadence === Cadence.QUARTERLY) {
        const slot = normalizeDueMonth(dueMonth, Cadence.QUARTERLY);
        if (slot === null) return false;
        return monthInQuarter(calendarMonth) === slot;
    }
    if (cadence === Cadence.YEARLY) {
        const slot = normalizeDueMonth(dueMonth, Cadence.YEARLY);
        if (slot === null) return false;
        return calendarMonth === slot;
    }
    return true;
}

/**
 * In the period month, has the charge day already occurred (through `asOf`)?
 * - Non-charge months (Q/Y) → false
 * - WEEKLY: at least one ISO weekday `dueDay` on or before `asOf` in that month
 * - else: calendar day-of-month `dueDay` ≤ asOf’s date (same month), or any day if asOf is after the month
 */
export function dueDayReachedInMonth(
    dueDay: number,
    cadence: Cadence | string | null | undefined,
    period: { year: number; month: number },
    asOf: Date = new Date(),
    dueMonth: number | null | undefined = null
): boolean {
    if (!isChargeMonth(cadence, dueMonth, period.month)) return false;

    const lastDayOfPeriod = new Date(period.year, period.month, 0).getDate();
    const asOfInPeriod = asOf.getFullYear() === period.year && asOf.getMonth() + 1 === period.month;
    const endDay = asOfInPeriod ? asOf.getDate() : lastDayOfPeriod;

    if (cadence === Cadence.WEEKLY) {
        for (let day = 1; day <= endDay; day++) {
            if (isoWeekday(new Date(period.year, period.month - 1, day)) === dueDay) {
                return true;
            }
        }
        return false;
    }

    return endDay >= dueDay;
}
