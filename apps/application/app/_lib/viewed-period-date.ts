import { currentYearMonth, type YearMonth } from '@rumtelo/utils';

import { todayIsoDate } from '@/app/_lib/money-input';

/**
 * Default date for creates while period-traveling:
 * 1st of the viewed month when not live; today in the live month.
 */
export function viewedPeriodDefaultIso(period: YearMonth, now = new Date()): string {
    const live = currentYearMonth(now);
    if (period.year === live.year && period.month === live.month) {
        return todayIsoDate();
    }
    return `${period.year}-${String(period.month).padStart(2, '0')}-01`;
}
