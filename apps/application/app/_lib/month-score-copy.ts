import type { MonthScoreUnlockKey, PeriodRecapHeadlineKey } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

/** Mirrors backend month-score level indices (1–5). */
export const MONTH_SCORE_LEVELS = [1, 2, 3, 4, 5] as const;

/** Within this many days of period end, nudge the household to prepare close. */
export const MONTH_CLOSE_SOON_DAYS = 5;

/** Open-month close urgency from signed `daysLeft` (period end − today). */
export type MonthCloseUrgency = 'ok' | 'soon' | 'today' | 'overdue';

export function monthCloseUrgency(daysLeft: number, isClosed: boolean): MonthCloseUrgency {
    if (isClosed) return 'ok';
    if (daysLeft < 0) return 'overdue';
    if (daysLeft === 0) return 'today';
    if (daysLeft <= MONTH_CLOSE_SOON_DAYS) return 'soon';
    return 'ok';
}

export function monthScoreLevelLabel(t: TranslateFn, level: number): string {
    const key = `levels.${level}`;
    return t.has(key) ? t(key) : String(level);
}

export function monthScoreUnlockLabel(t: TranslateFn, unlock: MonthScoreUnlockKey): string {
    const key = `levels.unlocks.${unlock}`;
    return t.has(key) ? t(key) : unlock;
}

export function monthScoreRecapHeadline(
    t: TranslateFn,
    headlineKey: PeriodRecapHeadlineKey,
    formatAmount: (amount: number) => string,
    leftOver: number
): string {
    if (headlineKey === 'surplus') {
        return t('recap.surplus', { amount: formatAmount(leftOver) });
    }
    return t('recap.overspent');
}
