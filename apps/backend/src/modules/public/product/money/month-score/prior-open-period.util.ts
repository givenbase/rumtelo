import { type EntityManager } from '@mikro-orm/postgresql';

import { endOfPeriodIso } from '@rumtelo/utils';

import { currentHouseholdId } from '../../../../../common/household/household.context';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentPeriod, previousPeriod } from '../../../../../common/utils/period.util';
import { AuthHousehold } from '../../../../auth/household/managed/household/auth-household.entity';
import { Transaction } from '../ledger/transaction/transaction.entity';
import { closeBlockersReady, collectCloseBlockers } from './close-blockers.util';
import { MonthScore } from './month-score.entity';
import { isPeriodClosed } from './period-lock.util';

/** How far back we look for an unfinished earlier month (avoids unbounded walks). */
const PRIOR_OPEN_LOOKBACK_MONTHS = 24;

/** First budget period the household can owe a close for (`YYYY-MM`, UTC). */
async function householdStartPeriod(em: EntityManager): Promise<string> {
    const household = await em.findOne(AuthHousehold, { id: currentHouseholdId() });
    const created = household?.createdAt ?? new Date();
    return `${created.getUTCFullYear()}-${String(created.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * True when this past period still needs a successful close before a later
 * month can be locked.
 *
 * Months before the household existed are ignored — fixed costs would otherwise
 * look "due" for every calendar month even when the board never started then.
 */
async function periodNeedsClose(
    em: EntityManager,
    period: string,
    startPeriod: string
): Promise<boolean> {
    if (period < startPeriod) return false;
    if (await isPeriodClosed(em, period)) return false;

    const scores = new HouseholdScopedRepository(em, MonthScore);
    const monthScore = await scores.findOne({ period });
    if (monthScore && !monthScore.isClosed) return true;

    const transactions = new HouseholdScopedRepository(em, Transaction);
    const activityCount = await transactions.count({
        bookedOn: { $gte: `${period}-01`, $lte: endOfPeriodIso(period) },
    });
    if (activityCount > 0) return true;

    // Bills / inbox only matter once the household actually lived in this month.
    const blockers = await collectCloseBlockers(em, period);
    return !closeBlockersReady(blockers);
}

/**
 * Nearest earlier period that must be closed before `period` can close.
 * Null when the chain is clear (or there is no earlier unfinished work).
 */
export async function findPriorOpenPeriod(
    em: EntityManager,
    period: string
): Promise<string | null> {
    const live = currentPeriod();
    const startPeriod = await householdStartPeriod(em);
    let cursor = previousPeriod(period);

    for (let step = 0; step < PRIOR_OPEN_LOOKBACK_MONTHS; step += 1) {
        // Never require closing the live month, futures, or pre-household months.
        if (cursor >= live) break;
        if (cursor >= period) break;
        if (cursor < startPeriod) break;

        if (await periodNeedsClose(em, cursor, startPeriod)) return cursor;
        cursor = previousPeriod(cursor);
    }

    return null;
}
