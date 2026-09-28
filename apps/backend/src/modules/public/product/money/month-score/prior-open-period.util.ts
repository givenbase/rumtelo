import { type EntityManager } from '@mikro-orm/postgresql';

import { endOfPeriodIso } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentPeriod, previousPeriod } from '../../../../../common/utils/period.util';
import { Transaction } from '../ledger/transaction/transaction.entity';
import { closeBlockersReady, collectCloseBlockers } from './close-blockers.util';
import { MonthScore } from './month-score.entity';
import { isPeriodClosed } from './period-lock.util';

/** How far back we look for an unfinished earlier month (avoids unbounded walks). */
const PRIOR_OPEN_LOOKBACK_MONTHS = 24;

/**
 * True when this past period still needs a successful close before a later
 * month can be locked — open score, leftover blockers, or ledger activity.
 */
async function periodNeedsClose(em: EntityManager, period: string): Promise<boolean> {
    if (await isPeriodClosed(em, period)) return false;

    const scores = new HouseholdScopedRepository(em, MonthScore);
    const monthScore = await scores.findOne({ period });
    if (monthScore && !monthScore.isClosed) return true;

    const blockers = await collectCloseBlockers(em, period);
    if (!closeBlockersReady(blockers)) return true;

    const transactions = new HouseholdScopedRepository(em, Transaction);
    const activityCount = await transactions.count({
        bookedOn: { $gte: `${period}-01`, $lte: endOfPeriodIso(period) },
    });
    return activityCount > 0;
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
    let cursor = previousPeriod(period);

    for (let step = 0; step < PRIOR_OPEN_LOOKBACK_MONTHS; step += 1) {
        // Never require closing the live month (or future) as a "prior".
        if (cursor >= live) break;
        if (cursor >= period) break;

        if (await periodNeedsClose(em, cursor)) return cursor;
        cursor = previousPeriod(cursor);
    }

    return null;
}
