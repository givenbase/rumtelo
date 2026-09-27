/** Calendar month as year + 1-based month (budget period). */
export type YearMonth = { year: number; month: number };

export type PeriodTravel = {
    /** Signed months from current calendar month: negative = past, positive = future. */
    monthsDelta: number;
    direction: 'current' | 'past' | 'future';
    /** "2 months ago" / "1 year ahead" / "This month" */
    relativeLabel: string;
    /** Approximate whole days from the 1st of the selected month to today. */
    daysApprox: number;
    /** Compact days phrase: "≈ 60 days ago" / "≈ 45 days ahead" / null when current. */
    daysLabel: string | null;
};

export function currentYearMonth(now = new Date()): YearMonth {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** Shift a calendar month by `deltaMonths` (negative = past). */
export function shiftYearMonth(period: YearMonth, deltaMonths: number): YearMonth {
    const date = new Date(period.year, period.month - 1 + deltaMonths, 1);
    return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

/** Months from `from` to `to`: positive if `to` is after `from`. */
export function monthsBetween(from: YearMonth, to: YearMonth): number {
    return (to.year - from.year) * 12 + (to.month - from.month);
}

export function isYearMonthBefore(left: YearMonth, right: YearMonth): boolean {
    return left.year < right.year || (left.year === right.year && left.month < right.month);
}

export function isYearMonthAfter(left: YearMonth, right: YearMonth): boolean {
    return left.year > right.year || (left.year === right.year && left.month > right.month);
}

export type PeriodTravelBounds = {
    floor: YearMonth;
    horizon: YearMonth;
};

/**
 * Period picker range: floor = household created month − 1 (never after live),
 * horizon = live + 12 months.
 */
export function periodTravelBounds(
    createdAt: Date | string | null | undefined,
    now = new Date()
): PeriodTravelBounds {
    const live = currentYearMonth(now);
    const horizon = shiftYearMonth(live, 12);
    const created =
        createdAt instanceof Date
            ? createdAt
            : typeof createdAt === 'string' && createdAt
              ? new Date(createdAt)
              : null;
    const createdMonth =
        created && !Number.isNaN(created.getTime())
            ? { year: created.getFullYear(), month: created.getMonth() + 1 }
            : live;
    let floor = shiftYearMonth(createdMonth, -1);
    if (isYearMonthAfter(floor, live)) floor = live;
    return { floor, horizon };
}

function formatSpan(absMonths: number, suffix: 'ago' | 'ahead'): string {
    if (absMonths === 1) return `1 month ${suffix}`;
    if (absMonths < 12) return `${absMonths} months ${suffix}`;
    const years = Math.floor(absMonths / 12);
    const rem = absMonths % 12;
    const yearPart = years === 1 ? '1 year' : `${years} years`;
    if (rem === 0) return `${yearPart} ${suffix}`;
    const monthPart = rem === 1 ? '1 month' : `${rem} months`;
    return `${yearPart} ${monthPart} ${suffix}`;
}

/**
 * How far a selected budget period sits from the live calendar month.
 * Used to warn when browsing history or peeking ahead.
 */
export function describePeriodTravel(selected: YearMonth, now = new Date()): PeriodTravel {
    const current = currentYearMonth(now);
    const monthsDelta = monthsBetween(current, selected);
    const selectedStart = new Date(selected.year, selected.month - 1, 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const daysApprox = Math.round((selectedStart.getTime() - startOfToday.getTime()) / 86_400_000);

    if (monthsDelta === 0) {
        return {
            monthsDelta: 0,
            direction: 'current',
            relativeLabel: 'This month',
            daysApprox: 0,
            daysLabel: null,
        };
    }

    const absM = Math.abs(monthsDelta);
    const absD = Math.abs(daysApprox);
    if (monthsDelta < 0) {
        return {
            monthsDelta,
            direction: 'past',
            relativeLabel: formatSpan(absM, 'ago'),
            daysApprox,
            daysLabel: absD === 0 ? null : `≈ ${absD} day${absD === 1 ? '' : 's'} ago`,
        };
    }

    return {
        monthsDelta,
        direction: 'future',
        relativeLabel: formatSpan(absM, 'ahead'),
        daysApprox,
        daysLabel: absD === 0 ? null : `≈ ${absD} day${absD === 1 ? '' : 's'} ahead`,
    };
}
