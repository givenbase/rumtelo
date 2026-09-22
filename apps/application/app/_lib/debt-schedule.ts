import { Cadence, DebtScheduleKind, type Debt } from '@rumtelo/contracts';

import { formatBookedDate } from '@/components/features/money/jar-badge';

/** Scoped to `features.money.debt.detail` keys (no `detail.` prefix). */
type DebtDetailTranslate = (key: string, values?: Record<string, string | number>) => string;

function cadenceLc(cadence: Cadence, t: DebtDetailTranslate): string {
    switch (cadence) {
        case Cadence.WEEKLY:
            return t('cadence_weekly_lc');
        case Cadence.QUARTERLY:
            return t('cadence_quarterly_lc');
        case Cadence.YEARLY:
            return t('cadence_yearly_lc');
        default:
            return t('cadence_monthly_lc');
    }
}

/** Unit for “/ week” style payment lines on debt detail. */
export function cadencePeriodUnit(cadence: Cadence, t: DebtDetailTranslate): string {
    switch (cadence) {
        case Cadence.WEEKLY:
            return t('period_week');
        case Cadence.QUARTERLY:
            return t('period_quarter');
        case Cadence.YEARLY:
            return t('period_year');
        default:
            return t('period_month');
    }
}

/** Short schedule line for list rows and detail progress. */
export function scheduleHint(
    debt: Debt,
    paymentsMade: number,
    t: DebtDetailTranslate,
    locale: string
): string | null {
    if (debt.scheduleKind === DebtScheduleKind.TERM && debt.termPayments !== null) {
        const left = Math.max(0, debt.termPayments - paymentsMade);
        return t('term_left', {
            left,
            total: debt.termPayments,
            cadence: cadenceLc(debt.paymentCadence, t),
        });
    }
    if (debt.scheduleKind === DebtScheduleKind.DEADLINE && debt.maturityOn) {
        return t('due_on', { date: formatBookedDate(debt.maturityOn, locale) });
    }
    return null;
}
