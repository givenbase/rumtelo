import type { MonthScoreUnlockKey, PeriodRecapHeadlineKey } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';

/** Mirrors backend month-score level indices (1–5). */
export const MONTH_SCORE_LEVELS = [1, 2, 3, 4, 5] as const;

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
