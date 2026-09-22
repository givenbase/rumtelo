import type { FixedCost, FixedCostSettlement, Transaction } from '@rumtelo/contracts';
import { FixedCostSettlementStatus, FlowDirection } from '@rumtelo/contracts';
import {
    fixedCostLifecycle,
    fixedCostPeriodStatus,
    isFixedCostCounting,
    monthlyAmount,
    type FixedCostLifecycle,
    type FixedCostPeriodStatus,
} from '@rumtelo/utils';

export type FixedCostStatus = FixedCostPeriodStatus;
export type { FixedCostLifecycle };
export { fixedCostLifecycle, isFixedCostCounting };

function normalize(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
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
    return fixedCostPeriodStatus(item, settlement, period, today);
}

export function lifecycleLabel(
    lifecycle: FixedCostLifecycle,
    labels: { active: string; paused: string; ended: string }
): string {
    if (lifecycle === 'paused') return labels.paused;
    if (lifecycle === 'ended') return labels.ended;
    return labels.active;
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
