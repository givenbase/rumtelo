import type { FixedCost, Transaction } from '@rumtelo/contracts';
import { monthlyAmount } from '@rumtelo/utils';

export type FixedCostStatus = 'taken' | 'due' | 'upcoming';

function normalize(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
}

/** Heuristic: period outflow likely settles this recurring bill. */
export function txMatchesFixedCost(tx: Transaction, item: FixedCost, monthly: number) {
    if (tx.amount >= 0) return false;
    if (tx.categoryId && item.categoryId && tx.categoryId !== item.categoryId) return false;

    const party = normalize(tx.counterparty);
    const desc = normalize(tx.description);
    const fcParty = normalize(item.counterparty);
    const fcName = normalize(item.name);

    if (fcParty && party && (party.includes(fcParty) || fcParty.includes(party))) return true;
    if (
        fcName &&
        ((party && (party.includes(fcName) || fcName.includes(party))) ||
            (desc && desc.includes(fcName)))
    ) {
        return true;
    }

    return Math.abs(Math.abs(tx.amount) - Math.abs(monthly)) <= 1;
}

export function fixedCostStatus(
    item: FixedCost,
    matchedTx: Transaction | undefined,
    period: { year: number; month: number },
    today: Date = new Date()
): FixedCostStatus {
    if (matchedTx) return 'taken';

    const dueDay = item.dueDay;
    if (dueDay === null || dueDay === undefined) return 'upcoming';

    const periodIsCurrent =
        today.getFullYear() === period.year && today.getMonth() + 1 === period.month;
    const periodIsPast =
        period.year < today.getFullYear() ||
        (period.year === today.getFullYear() && period.month < today.getMonth() + 1);

    if (periodIsPast) return 'due';
    if (!periodIsCurrent) return 'upcoming';
    return today.getDate() >= dueDay ? 'due' : 'upcoming';
}

/** Match each fixed cost to at most one period payment; returns claimed tx ids + map. */
export function claimFixedCostMatches(
    fixedCosts: readonly FixedCost[],
    transactions: readonly Transaction[]
) {
    const claimedTxIds = new Set<string>();
    const matchByFixedCostId = new Map<string, Transaction>();

    for (const item of fixedCosts) {
        const monthly = monthlyAmount(item.amount, item.cadence);
        const match = transactions.find(
            tx => !claimedTxIds.has(tx.id) && txMatchesFixedCost(tx, item, monthly)
        );
        if (match) {
            claimedTxIds.add(match.id);
            matchByFixedCostId.set(item.id, match);
        }
    }

    return { claimedTxIds, matchByFixedCostId };
}
