import { Cadence, DebtScheduleKind, type Debt } from '@rumtelo/contracts';

import { formatBookedDate } from '@/components/features/money/jar-badge';

function cadenceWord(cadence: Cadence): string {
    switch (cadence) {
        case Cadence.WEEKLY:
            return 'weekly';
        case Cadence.QUARTERLY:
            return 'quarterly';
        case Cadence.YEARLY:
            return 'yearly';
        default:
            return 'monthly';
    }
}

/** Short schedule line for list rows and detail progress. */
export function scheduleHint(debt: Debt, paymentsMade: number): string | null {
    if (debt.scheduleKind === DebtScheduleKind.TERM && debt.termPayments !== null) {
        const left = Math.max(0, debt.termPayments - paymentsMade);
        return `${left} of ${debt.termPayments} ${cadenceWord(debt.paymentCadence)} left`;
    }
    if (debt.scheduleKind === DebtScheduleKind.DEADLINE && debt.maturityOn) {
        return `due ${formatBookedDate(debt.maturityOn)}`;
    }
    return null;
}

export { cadenceWord };
