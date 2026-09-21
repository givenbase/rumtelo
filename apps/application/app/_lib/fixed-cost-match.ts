import type { FixedCost, FixedCostSettlement, Transaction } from '@rumtelo/contracts';
import { FixedCostSettlementStatus, FlowDirection } from '@rumtelo/contracts';
import {
    fixedCostLifecycle,
    isFixedCostCounting,
    monthlyAmount,
    type FixedCostLifecycle,
} from '@rumtelo/utils';

export type FixedCostStatus = 'taken' | 'due' | 'upcoming' | 'skipped';
export type { FixedCostLifecycle };
export { fixedCostLifecycle, isFixedCostCounting };

function normalize(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
}

function periodParts(periodKey: string): { year: number; month: number } {
    const [yearPart, monthPart] = periodKey.split('-');
    return { year: Number(yearPart), month: Number(monthPart) };
}

/** Heuristic: period row likely settles this recurring bill (suggestion only). */
export function txMatchesFixedCost(tx: Transaction, item: FixedCost, monthly: number) {
    const isOut = item.direction === FlowDirection.OUT;
    if (isOut && tx.amount >= 0) return false;
    if (!isOut && tx.amount <= 0) return false;
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

/**
 * Period status from durable settlements. Heuristic matches are not Taken.
 */
export function fixedCostStatus(
    item: FixedCost,
    settlement: FixedCostSettlement | undefined,
    period: { year: number; month: number } | string,
    today: Date = new Date()
): FixedCostStatus {
    if (!isFixedCostCounting(item)) return 'upcoming';
    if (settlement?.status === FixedCostSettlementStatus.PAID) return 'taken';
    if (settlement?.status === FixedCostSettlementStatus.SKIPPED) return 'skipped';

    const dueDay = item.dueDay;
    if (dueDay === null || dueDay === undefined) return 'upcoming';

    const parts = typeof period === 'string' ? periodParts(period) : period;
    const periodIsCurrent =
        today.getFullYear() === parts.year && today.getMonth() + 1 === parts.month;
    const periodIsPast =
        parts.year < today.getFullYear() ||
        (parts.year === today.getFullYear() && parts.month < today.getMonth() + 1);

    if (periodIsPast) return 'due';
    if (!periodIsCurrent) return 'upcoming';
    return today.getDate() >= dueDay ? 'due' : 'upcoming';
}

export function lifecycleLabel(lifecycle: FixedCostLifecycle): string {
    if (lifecycle === 'paused') return 'Paused';
    if (lifecycle === 'ended') return 'Ended';
    return 'Active';
}

/** ISO calendar date (UTC) for endsOn when ending a bill. */
export function todayIsoDate(today: Date = new Date()): string {
    return today.toISOString().slice(0, 10);
}

/** Map settlements by fixedCostId for a single period list. */
export function settlementsByFixedCostId(settlements: readonly FixedCostSettlement[]) {
    const map = new Map<string, FixedCostSettlement>();
    for (const settlement of settlements) {
        map.set(settlement.fixedCostId, settlement);
    }
    return map;
}

/**
 * Tx ids that count as bill payments for leftover math — only explicit links,
 * never heuristic-only matches.
 */
export function claimLinkedFixedCostTxIds(
    transactions: readonly Transaction[],
    settlements: readonly FixedCostSettlement[] = []
) {
    const claimedTxIds = new Set<string>();
    for (const tx of transactions) {
        if (tx.fixedCostId) claimedTxIds.add(tx.id);
    }
    for (const settlement of settlements) {
        if (settlement.transactionId) claimedTxIds.add(settlement.transactionId);
    }
    return claimedTxIds;
}

/**
 * Suggest a fixed cost to link when sorting — does not mark Taken.
 * Prefer unsettled bills; skip already-linked txs and already-settled bills.
 */
export function suggestFixedCostForTx(
    tx: Transaction,
    fixedCosts: readonly FixedCost[],
    settlements: readonly FixedCostSettlement[] = []
): FixedCost | undefined {
    if (tx.fixedCostId || tx.debtId) return undefined;
    const settled = new Set(
        settlements
            .filter(
                row =>
                    row.status === FixedCostSettlementStatus.PAID ||
                    row.status === FixedCostSettlementStatus.SKIPPED
            )
            .map(row => row.fixedCostId)
    );

    for (const item of fixedCosts) {
        if (!isFixedCostCounting(item)) continue;
        if (settled.has(item.id)) continue;
        const monthly = monthlyAmount(item.amount, item.cadence);
        if (txMatchesFixedCost(tx, item, monthly)) return item;
    }
    return undefined;
}

/**
 * @deprecated Prefer settlements + claimLinkedFixedCostTxIds. Kept for suggestion maps.
 * Match each fixed cost to at most one period payment (heuristic).
 */
export function claimFixedCostMatches(
    fixedCosts: readonly FixedCost[],
    transactions: readonly Transaction[]
) {
    const claimedTxIds = new Set<string>();
    const matchByFixedCostId = new Map<string, Transaction>();

    for (const item of fixedCosts) {
        const monthly = monthlyAmount(item.amount, item.cadence);
        const match = transactions.find(
            tx =>
                !claimedTxIds.has(tx.id) && !tx.fixedCostId && txMatchesFixedCost(tx, item, monthly)
        );
        if (match) {
            claimedTxIds.add(match.id);
            matchByFixedCostId.set(item.id, match);
        }
    }

    return { claimedTxIds, matchByFixedCostId };
}
