import { CADENCE_TO_MONTHLY, type Cadence } from '@rumtelo/contracts';

/** Convert a cadence amount to a monthly-equivalent (integer minor units). */
export function monthlyAmount(amount: number, cadence: Cadence | string): number {
    const factor = CADENCE_TO_MONTHLY[cadence as Cadence] ?? 0;
    return Math.round(amount * factor);
}

export type JarCoverageInput = {
    allocated: number;
    spent: number;
    /** Sorted Transaction In for the jar this period (gifts, top-ups). */
    credited?: number;
    committedOut: number;
};

export type JarCoverage = {
    /** allocated + credited − spent (transactions only; ignores fixed commitments). */
    remaining: number;
    /** remaining − committedOut — primary leftover for UI. */
    available: number;
    /** available / (allocated + credited), clamped 0..1; null when envelope is empty. */
    progress: number | null;
    /** (spent + committedOut) / (allocated + credited) for progress bars, clamped 0..1. */
    usedProgress: number | null;
    overspent: boolean;
};

/** remaining = allocated + credited − spent; available also subtracts fixed Out. */
export function jarCoverage(input: JarCoverageInput): JarCoverage {
    const credited = input.credited ?? 0;
    const envelope = input.allocated + credited;
    const remaining = envelope - input.spent;
    const available = remaining - input.committedOut;
    const used = input.spent + input.committedOut;
    return {
        remaining,
        available,
        progress: envelope > 0 ? Math.min(1, Math.max(0, available / envelope)) : null,
        usedProgress: envelope > 0 ? Math.min(1, Math.max(0, used / envelope)) : null,
        overspent: available < 0,
    };
}

/** 0..100 width for progress bars — overspent jars fill to 100. */
export function usedPctDisplay(coverage: Pick<JarCoverage, 'usedProgress' | 'overspent'>): number {
    if (coverage.overspent) return 100;
    if (coverage.usedProgress === null) return 0;
    return Math.round(coverage.usedProgress * 100);
}

/**
 * Split an amount across weighted shares without losing or inventing a cent.
 * Remainder from floor-rounding goes to the largest share.
 */
export function allocateByPercentage(
    total: number,
    shares: readonly { id: string; percentage: number }[]
): { id: string; amount: number }[] {
    if (shares.length === 0) return [];

    const allocated = shares.map(share => ({
        id: share.id,
        amount: Math.floor((total * share.percentage) / 100),
        percentage: share.percentage,
    }));

    const distributed = allocated.reduce((running, share) => running + share.amount, 0);
    const remainder = total - distributed;

    if (remainder !== 0) {
        const largest = allocated.reduce((left, right) =>
            right.percentage > left.percentage ? right : left
        );
        largest.amount += remainder;
    }

    return allocated.map(({ id, amount }) => ({ id, amount }));
}

/** Planned category envelope = manual budgeted + monthly fixed OUT on that category. */
export function categoryEnvelope(manualBudgeted: number, committedFixedOut: number): number {
    return manualBudgeted + committedFixedOut;
}

export type CategoryVariance = {
    diff: number;
    over: boolean;
};

/** planned − actual; over when spent exceeds planned. */
export function categoryVariance(budgeted: number, actual: number): CategoryVariance {
    const diff = budgeted - actual;
    return { diff, over: diff < 0 };
}

type FixedOutLike = {
    amount: number;
    cadence: Cadence | string;
    direction?: string;
    isActive?: boolean;
    /** When set with isActive false → ended; future endsOn on an active bill is still counting. */
    endsOn?: string | null;
};

/**
 * Lifecycle derived from stored flags — no separate status column.
 * - active: isActive true (optional future endsOn is still a plan date)
 * - paused: isActive false, and endsOn is missing or still in the future
 * - ended: isActive false and endsOn is today or earlier
 */
export type FixedCostLifecycle = 'active' | 'paused' | 'ended';

export function fixedCostLifecycle(
    item: {
        isActive?: boolean;
        endsOn?: string | null;
    },
    asOf: string = new Date().toISOString().slice(0, 10)
): FixedCostLifecycle {
    if (item.isActive === false) {
        if (item.endsOn && item.endsOn <= asOf) return 'ended';
        return 'paused';
    }
    return 'active';
}

/** True when the bill should count toward jar pressure / monthly out. */
export function isFixedCostCounting(item: { isActive?: boolean; endsOn?: string | null }): boolean {
    return item.isActive !== false;
}

/**
 * Sum monthly-normalised OUT fixed costs.
 * Pass already-filtered OUT items, or include direction/isActive for filtering.
 */
export function sumMonthlyFixedOut(
    items: readonly FixedOutLike[],
    opts?: { activeOnly?: boolean }
): number {
    const activeOnly = opts?.activeOnly ?? true;
    return items.reduce((total, item) => {
        if (item.direction !== undefined && item.direction !== 'OUT') return total;
        if (activeOnly && !isFixedCostCounting(item)) return total;
        return total + monthlyAmount(Math.abs(item.amount), item.cadence);
    }, 0);
}

/** Sum monthly-normalised amounts (e.g. income sources). */
export function sumMonthly(
    items: readonly { amount: number; cadence: Cadence | string; isActive?: boolean }[],
    opts?: { activeOnly?: boolean }
): number {
    const activeOnly = opts?.activeOnly ?? true;
    return items.reduce((total, item) => {
        if (activeOnly && item.isActive === false) return total;
        return total + monthlyAmount(item.amount, item.cadence);
    }, 0);
}

export type FixedOutNetSummary = {
    net: number;
    outTotal: number;
    leftover: number;
    commitmentRatio: number;
};

/** Monthly income vs monthly fixed OUT rollup for headlines. */
export function fixedOutNetSummary(
    incomeItems: readonly { amount: number; cadence: Cadence | string; isActive?: boolean }[],
    outItems: readonly FixedOutLike[],
    opts?: { activeOnly?: boolean }
): FixedOutNetSummary {
    const net = sumMonthly(incomeItems, opts);
    const outTotal = sumMonthlyFixedOut(outItems, opts);
    return {
        net,
        outTotal,
        leftover: net - outTotal,
        commitmentRatio: net > 0 ? Math.round((outTotal / net) * 100) : 0,
    };
}

export type IncomePeriodLike = {
    amount: number;
    effectiveOn: string;
};

export type IncomeSourceForNet = {
    amount: number;
    cadence: Cadence | string;
    isActive?: boolean;
    periods?: readonly IncomePeriodLike[];
};

/**
 * Household monthly net as of a date.
 * Per active source: period with max effectiveOn <= asOf, else cached amount.
 */
export function monthlyNetAsOf(sources: readonly IncomeSourceForNet[], asOfDate: string): number {
    const asOf = asOfDate.slice(0, 10);
    return sources.reduce((total, source) => {
        if (source.isActive === false) return total;
        const periods = source.periods ?? [];
        const applicable = periods
            .filter(period => period.effectiveOn.slice(0, 10) <= asOf)
            .sort((left, right) => right.effectiveOn.localeCompare(left.effectiveOn));
        const amount = applicable[0]?.amount ?? source.amount;
        return total + monthlyAmount(amount, source.cadence);
    }, 0);
}

export type IncomeDelta = {
    absolute: number;
    /** later/earlier − 1 when earlier > 0; otherwise null. */
    ratio: number | null;
};

export function incomeDelta(earlierNet: number, laterNet: number): IncomeDelta {
    const absolute = laterNet - earlierNet;
    return {
        absolute,
        ratio: earlierNet > 0 ? laterNet / earlierNet - 1 : null,
    };
}

export type EarnGoalProgress = {
    current: number;
    remaining: number;
    reached: boolean;
};

export function earnGoalProgress(input: { target: number; currentNet: number }): EarnGoalProgress {
    const remaining = Math.max(0, input.target - input.currentNet);
    return {
        current: input.currentNet,
        remaining,
        reached: input.currentNet >= input.target,
    };
}
