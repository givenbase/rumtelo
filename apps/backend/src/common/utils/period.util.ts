/**
 * Period and week keys. Defined once here because the month-score engine, the
 * week-check engine and every dashboard query must agree on what "this month" means.
 */

/** Budget period key, YYYY-MM. One period is one month-score window. */
export function currentPeriod(date = new Date()): string {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function previousPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number) as [number, number];
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
}

export function daysInPeriod(period: string): number {
    const [year, month] = period.split('-').map(Number) as [number, number];
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Signed calendar days from today (UTC) to the last day of `period`.
 * Positive = days still left · 0 = last day · negative = days overdue.
 */
export function daysUntilPeriodEnd(period: string, now = new Date()): number {
    const [year, month] = period.split('-').map(Number) as [number, number];
    const endMs = Date.UTC(year, month, 0);
    const todayMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    return Math.round((endMs - todayMs) / 86_400_000);
}

/** ISO week key, YYYY-Www. The unit of the weekly week check. */
export function currentWeek(date = new Date()): string {
    const thursday = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
    );
    const day = thursday.getUTCDay() || 7;
    thursday.setUTCDate(thursday.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${thursday.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
