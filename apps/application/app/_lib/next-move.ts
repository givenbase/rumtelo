/**
 * Home's one next move, picked from plain facts. Pure: no hooks, no I/O.
 * The first matching row wins (docs/product/clarity-2-stories.md, S-5.2).
 */

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type NextMove =
    | { kind: 'CLOSE_PRIOR'; month: string }
    | { kind: 'NO_TRANSACTIONS'; zeroIncome: boolean }
    | { kind: 'INBOX'; count: number; minutes: number }
    | { kind: 'WEEK_CHECK' }
    | { kind: 'CLOSE_MONTH'; month: string; daysLeft: number }
    | { kind: 'CALM'; nextCheckDay: Weekday };

export type NextMoveInput = {
    /** `YYYY-MM-DD`, the day the card is about (always now, never a travelled period). */
    today: string;
    /** Household reminder day (ISO weekday), or null when none is set. */
    reminderDay: number | null;
    /** Last week's check was started and is still open (Monday grace, S-4.1). */
    weekCheckGraceOpen?: boolean;
    inboxCount: number;
    /** Income booked for the current period, in minor units. */
    incomeTotal: number;
    monthScore: {
        /** Current period (`YYYY-MM`). */
        period: string;
        isClosed: boolean;
        /** Signed days to the last day of the period. */
        daysLeft: number;
        priorOpenPeriod: string | null;
    };
    progress: {
        hasTransactions: boolean;
        weekCheckDoneThisWeek: boolean;
    };
};

/** Days before the end of a period when "close the month" becomes the next move. */
export const CLOSE_MONTH_WINDOW_DAYS = 6;

/** Lines the user can sort in a minute, for the "about N minutes" line. */
const INBOX_LINES_PER_MINUTE = 6;

export function inboxMinutes(count: number): number {
    return Math.max(1, Math.ceil(count / INBOX_LINES_PER_MINUTE));
}

export function isoWeekdayOf(isoDate: string): Weekday {
    const day = new Date(`${isoDate}T00:00:00Z`).getUTCDay() || 7;
    return day as Weekday;
}

/**
 * Friday, Saturday or Sunday, or from the household's reminder day onward. A check left
 * open from last week counts as due from Monday on. The one place that defines "due".
 */
export function isWeekCheckDue(
    today: string,
    reminderDay: number | null,
    graceOpen = false
): boolean {
    if (graceOpen) return true;
    const weekday = isoWeekdayOf(today);
    if (weekday >= 5) return true;
    return reminderDay !== null && weekday >= reminderDay;
}

export function resolveNextMove(input: NextMoveInput): NextMove {
    const { monthScore, progress } = input;

    if (monthScore.priorOpenPeriod) {
        return { kind: 'CLOSE_PRIOR', month: monthScore.priorOpenPeriod };
    }
    if (!progress.hasTransactions) {
        return { kind: 'NO_TRANSACTIONS', zeroIncome: input.incomeTotal === 0 };
    }
    if (input.inboxCount > 0) {
        return {
            kind: 'INBOX',
            count: input.inboxCount,
            minutes: inboxMinutes(input.inboxCount),
        };
    }
    if (
        !progress.weekCheckDoneThisWeek &&
        isWeekCheckDue(input.today, input.reminderDay, input.weekCheckGraceOpen)
    ) {
        return { kind: 'WEEK_CHECK' };
    }
    if (!monthScore.isClosed && monthScore.daysLeft <= CLOSE_MONTH_WINDOW_DAYS) {
        return { kind: 'CLOSE_MONTH', month: monthScore.period, daysLeft: monthScore.daysLeft };
    }
    const reminder = input.reminderDay;
    const nextCheckDay = (
        reminder !== null && reminder >= 1 && reminder <= 7 ? reminder : 7
    ) as Weekday;
    return { kind: 'CALM', nextCheckDay };
}
