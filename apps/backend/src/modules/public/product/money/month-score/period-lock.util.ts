import { type EntityManager } from '@mikro-orm/postgresql';

import { apiBadRequest } from '../../../../../common/errors/api-user-error';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { periodFromBookedOn } from '../plan/fixed-cost/fixed-cost-link.util';
import { MonthScore } from './month-score.entity';

/** True when the household has closed this budget period (`YYYY-MM`). */
export async function isPeriodClosed(em: EntityManager, period: string): Promise<boolean> {
    const monthScore = await em.findOne(MonthScore, {
        household: currentHouseholdId(),
        period,
    });
    return Boolean(monthScore?.isClosed);
}

/** Reject writes that would change ledger history for a closed month. */
export async function assertPeriodOpen(em: EntityManager, period: string): Promise<void> {
    if (await isPeriodClosed(em, period)) {
        throw apiBadRequest('period_closed');
    }
}

export async function assertBookedOnPeriodOpen(em: EntityManager, bookedOn: string): Promise<void> {
    await assertPeriodOpen(em, periodFromBookedOn(bookedOn));
}
