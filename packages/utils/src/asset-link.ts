/**
 * Money linked to a Growth holding (asset in / out).
 *
 * Attribution only — never changes jar maths. Bills and income keep their jar;
 * these helpers just roll up what a holding brings in and costs each month.
 */

import type { Cadence } from '@rumtelo/contracts';

import {
    type IncomeSourceForNet,
    incomeAmountAsOf,
    monthlyAmount,
    sumMonthlyFixedOut,
} from './money-plan';

export type AssetLinkedBill = {
    assetId?: string | null;
    amount: number;
    cadence: Cadence | string;
    direction?: string;
    isActive?: boolean;
    startedOn?: string | null;
    endsOn?: string | null;
};

export type AssetLinkedIncome = IncomeSourceForNet & { assetId?: string | null };

export type AssetFlowSummary = {
    /** Linked income sources per month, or the asset's own `flow` when none are linked. */
    monthlyIn: number;
    /** Linked active OUT bills per month (same as-of maths as the jars). */
    monthlyOut: number;
    /** monthlyIn − monthlyOut. */
    monthlyNet: number;
    /** True when `monthlyIn` came from linked sources instead of `flow`. */
    inFromSources: boolean;
};

/** Bills attributed to one holding. Pass `assetId` to filter a mixed list. */
export function billsForAsset<T extends { assetId?: string | null }>(
    bills: readonly T[],
    assetId: string
): T[] {
    return bills.filter(bill => bill.assetId === assetId);
}

/** Income sources attributed to one holding. */
export function incomeForAsset<T extends { assetId?: string | null }>(
    sources: readonly T[],
    assetId: string
): T[] {
    return sources.filter(source => source.assetId === assetId);
}

/**
 * Monthly OUT for bills already filtered to one holding.
 * Same rules as the jar totals: OUT only, active, in range on `asOf`.
 */
export function linkedMonthlyOut(bills: readonly AssetLinkedBill[], asOf: string): number {
    return sumMonthlyFixedOut(bills, { asOf });
}

/**
 * Monthly IN for one holding.
 * Linked sources win; the asset's own `flow` is only the fallback when none are linked.
 * Never both — that would double count.
 */
export function assetMonthlyIn(
    asset: { flow: number },
    sources: readonly AssetLinkedIncome[],
    asOf: string
): { amount: number; fromSources: boolean } {
    if (sources.length === 0) return { amount: Math.max(0, asset.flow), fromSources: false };
    const asOfDate = asOf.slice(0, 10);
    const amount = sources.reduce((total, source) => {
        const perCadence = incomeAmountAsOf(source, asOfDate);
        if (perCadence === null) return total;
        return total + monthlyAmount(perCadence, source.cadence);
    }, 0);
    return { amount, fromSources: true };
}

/** In / out / net headline for an asset detail page. */
export function assetFlowSummary(
    asset: { flow: number },
    linkedSources: readonly AssetLinkedIncome[],
    linkedBills: readonly AssetLinkedBill[],
    asOf: string
): AssetFlowSummary {
    const inflow = assetMonthlyIn(asset, linkedSources, asOf);
    const monthlyOut = linkedMonthlyOut(linkedBills, asOf);
    return {
        monthlyIn: inflow.amount,
        monthlyOut,
        monthlyNet: inflow.amount - monthlyOut,
        inFromSources: inflow.fromSources,
    };
}

export type BusinessHouseholdLeak = {
    active: boolean;
    /** Monthly OUT attributed to BUSINESS holdings (cents). */
    monthlyOutCents: number;
    billCount: number;
    /** Prefer a single name when only one business leaks; else null for generic copy. */
    primaryName: string | null;
    assetIds: string[];
};

/**
 * BUSINESS holding bills still paid from the private account.
 * Attribution only — jars stay private; Coach steers toward paying from the business.
 */
export function evaluateBusinessHouseholdLeak(input: {
    assets: readonly { id: string; kindKey: string; name: string }[];
    bills: readonly AssetLinkedBill[];
    asOf: string;
}): BusinessHouseholdLeak {
    const business = input.assets.filter(asset => asset.kindKey === 'BUSINESS');
    if (business.length === 0) {
        return {
            active: false,
            monthlyOutCents: 0,
            billCount: 0,
            primaryName: null,
            assetIds: [],
        };
    }

    const byId = new Map(business.map(asset => [asset.id, asset]));
    const linked = input.bills.filter(
        bill => typeof bill.assetId === 'string' && byId.has(bill.assetId)
    );
    const monthlyOutCents = linkedMonthlyOut(linked, input.asOf);
    if (monthlyOutCents <= 0 || linked.length === 0) {
        return {
            active: false,
            monthlyOutCents: 0,
            billCount: 0,
            primaryName: null,
            assetIds: [],
        };
    }

    const leakingIds = [
        ...new Set(
            linked
                .map(bill => bill.assetId)
                .filter((id): id is string => typeof id === 'string' && byId.has(id))
        ),
    ];

    return {
        active: true,
        monthlyOutCents,
        billCount: linked.length,
        primaryName: leakingIds.length === 1 ? (byId.get(leakingIds[0]!)?.name ?? null) : null,
        assetIds: leakingIds,
    };
}
