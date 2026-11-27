import { allocateByPercentage } from '@rumtelo/utils';

import { JAR_SHARE_BASELINE_PERIOD } from './jar-share.entity';

/**
 * Pure maths behind a pot's running balance. A pot's share is a history (`JarShare` rows), the
 * household's income is a history (income amount periods); the cumulative deposit walks both,
 * month by month, so a later split or income change never re-prices an earlier month.
 * Everything here is integers: basis points (0.01 %) and eurocents.
 */

/** A stored percentage (decimal string or number) as integer basis points (0.01 %). */
export function toBasisPoints(percentage: string | number): number {
    return Math.round(Number(percentage) * 100);
}

/** Basis points back to the stored decimal string with two decimals. */
export function fromBasisPoints(basisPoints: number): string {
    return (basisPoints / 100).toFixed(2);
}

/** `YYYY-MM` as a whole number of months, so month arithmetic is plain integer maths. */
export function periodIndex(period: string): number {
    return Number(period.slice(0, 4)) * 12 + Number(period.slice(5, 7)) - 1;
}

/** Inverse of {@link periodIndex}. */
export function periodFromIndex(index: number): string {
    const year = Math.floor(index / 12);
    return `${year}-${String((index % 12) + 1).padStart(2, '0')}`;
}

/** One entry of a pot's share history: from `period` on, the pot takes `basisPoints`. */
export type PotShare = { period: string; basisPoints: number };

/**
 * A pot's share history, oldest first. A pot with no rows at all (created in a deploy window,
 * before the share history existed) is treated as having one baseline row with its current
 * percentage; nothing is written for that on read.
 */
export function potShareHistory(
    rows: readonly { period: string; percentage: string | number }[] | undefined,
    currentPercentage: string | number
): PotShare[] {
    if (!rows || rows.length === 0) {
        return [
            { period: JAR_SHARE_BASELINE_PERIOD, basisPoints: toBasisPoints(currentPercentage) },
        ];
    }
    return rows
        .map(row => ({ period: row.period, basisPoints: toBasisPoints(row.percentage) }))
        .sort((left, right) => left.period.localeCompare(right.period));
}

/**
 * A pot's share history as a READ sees it, healed against drift a deploy window can leave
 * (the old backend still runs `activate` / `deactivate` / `updateSplit` for a short while after
 * the table exists, and it writes no share rows):
 *
 * - The share for `currentPeriod` is always `currentPercentage` (`jar.percentage`, the source
 *   of truth for today), whatever the rows say, so the current month cannot be affected by drift.
 * - A pot with no rows at all, in a household that has rows for other pots, was created by the
 *   old code after the table existed: it counts from `currentPeriod` on (like a pot turned on
 *   now), never from the 1970 baseline, or the past months would total more than 100 %.
 * - A pot with no rows in a household with no rows at all (before the migration ran) is read as
 *   one baseline row with its percentage, for every pot alike.
 */
export function healedShareHistory(
    rows: readonly { period: string; percentage: string | number }[] | undefined,
    currentPercentage: string | number,
    currentPeriod: string,
    householdHasRows: boolean
): PotShare[] {
    const basisPoints = toBasisPoints(currentPercentage);
    if (!rows || rows.length === 0) {
        return [
            {
                period: householdHasRows ? currentPeriod : JAR_SHARE_BASELINE_PERIOD,
                basisPoints,
            },
        ];
    }
    const history = potShareHistory(rows, currentPercentage);
    if (shareBasisPointsAt(history, currentPeriod) === basisPoints) return history;
    return [
        ...history.filter(share => share.period !== currentPeriod),
        { period: currentPeriod, basisPoints },
    ].sort((left, right) => left.period.localeCompare(right.period));
}

/**
 * The pot's share in `period`: the row with the greatest period at or before it. No such row
 * means the pot did not exist yet (0).
 */
export function shareBasisPointsAt(history: readonly PotShare[], period: string): number {
    let found = 0;
    for (const share of history) {
        if (share.period > period) break;
        found = share.basisPoints;
    }
    return found;
}

/**
 * One month's income split over the pots, in eurocents.
 *
 * - Shares totalling exactly 100.00 go through `allocateByPercentage`: the rounding remainder
 *   lands on the largest share, so the pots add up to the income to the cent.
 * - Shares totalling MORE than 100.00 (drift after an old-backend write) are scaled down
 *   proportionally, in integer maths, with the remainder on the largest share (the first on a
 *   tie): the month allocates exactly the income, never more, so no money is invented.
 * - Shares totalling LESS than 100.00 get what they say, rounded down; the rest stays
 *   unallocated rather than being handed to a pot.
 */
export function allocateMonth(
    income: number,
    shares: readonly { id: string; basisPoints: number }[]
): { id: string; amount: number }[] {
    const total = shares.reduce((running, share) => running + share.basisPoints, 0);
    if (total === 10_000) {
        return allocateByPercentage(
            income,
            shares.map(share => ({ id: share.id, percentage: share.basisPoints / 100 }))
        );
    }
    if (total > 10_000) {
        const scaled = shares.map(share => ({
            id: share.id,
            basisPoints: share.basisPoints,
            amount: Math.floor((income * share.basisPoints) / total),
        }));
        const remainder = income - scaled.reduce((running, share) => running + share.amount, 0);
        if (remainder !== 0) {
            const largest = scaled.reduce((left, right) =>
                right.basisPoints > left.basisPoints ? right : left
            );
            largest.amount += remainder;
        }
        return scaled.map(({ id, amount }) => ({ id, amount }));
    }
    return shares.map(share => ({
        id: share.id,
        amount: Math.floor((income * share.basisPoints) / 10_000),
    }));
}

/**
 * Everything each pot was deposited from `fromPeriod` through `throughPeriod` (both inclusive):
 * the sum over those months of `allocateMonth(income of the month, shares of the month)`.
 *
 * Months where neither the income nor any share changes are one segment: the allocation is
 * worked out once and multiplied by the segment's length, so the work follows the number of
 * changes, not the number of months. The segment boundaries are the start, every share period
 * and every `incomeChangePeriods` month; income is evaluated by the caller (`incomeAsOfPeriod`)
 * with the same function a single month uses.
 */
export function cumulativeDepositsByPot(input: {
    fromPeriod: string;
    throughPeriod: string;
    pots: readonly { id: string; history: readonly PotShare[] }[];
    /** Monthly net income (eurocents) for a budget month. */
    incomeAsOfPeriod: (period: string) => number;
    /** Months where income may change (see `incomeChangePeriods`). */
    incomeChangePeriods: readonly string[];
}): Map<string, number> {
    const totals = new Map(input.pots.map(pot => [pot.id, 0]));
    const last = periodIndex(input.throughPeriod);
    const first = Math.min(periodIndex(input.fromPeriod), last);

    const boundaries = new Set<number>([first]);
    const consider = (period: string) => {
        const index = periodIndex(period);
        if (index > first && index <= last) boundaries.add(index);
    };
    for (const pot of input.pots) for (const share of pot.history) consider(share.period);
    for (const period of input.incomeChangePeriods) consider(period);

    const starts = [...boundaries].sort((left, right) => left - right);
    starts.forEach((start, position) => {
        const months = (starts[position + 1] ?? last + 1) - start;
        const period = periodFromIndex(start);
        const allocations = allocateMonth(
            input.incomeAsOfPeriod(period),
            input.pots.map(pot => ({
                id: pot.id,
                basisPoints: shareBasisPointsAt(pot.history, period),
            }))
        );
        for (const allocation of allocations) {
            totals.set(
                allocation.id,
                (totals.get(allocation.id) ?? 0) + months * allocation.amount
            );
        }
    });
    return totals;
}

/**
 * Merge a turned-off pot's history into its group's main pot: for every period where either has
 * a row, main(P) = main share at P + removed share at P. The result is the main pot's complete
 * history, so every past month keeps the money both pots had; `currentPeriod` is always among
 * the periods so the main pot's current share is the sum of both.
 */
export function mergeShareHistories(
    main: readonly PotShare[],
    removed: readonly PotShare[],
    currentPeriod: string
): PotShare[] {
    const periods = new Set<string>([currentPeriod]);
    for (const share of main) periods.add(share.period);
    for (const share of removed) periods.add(share.period);
    return [...periods].sort().map(period => ({
        period,
        basisPoints: shareBasisPointsAt(main, period) + shareBasisPointsAt(removed, period),
    }));
}
