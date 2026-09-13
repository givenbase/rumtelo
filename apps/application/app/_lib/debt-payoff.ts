/**
 * Client-side debt payoff simulator — used on the Debt screen to compare
 * Avalanche, Snowball, and Minimal.
 *
 * Each month:
 * 1. Accrue interest on every open balance.
 * 2. Minimal: pay each contractual minimum only (no extra, no rollover).
 * 3. Avalanche / Snowball: keep a fixed monthly pool = all original minimums
 *    + extra. Pay minimums first, then dump the leftover onto the target
 *    (highest rate or smallest balance). When a debt clears, its minimum
 *    stays in the pool — classic rollover.
 *
 * Important: if the highest-rate debt is also the smallest balance, Avalanche
 * and Snowball attack the same debt every month and the totals are identical.
 * That is correct math, not a bug — only Minimal then differs.
 */

import { PayoffStrategy } from '@rumtelo/contracts';

export type DebtPayoffInput = {
    balance: number;
    interestRate: number;
    minimumPayment: number;
};

export type DebtPayoffResult = {
    months: number;
    /** Total interest accrued over the run (minor units). */
    interest: number;
    /** Calendar month when the last balance clears; null when empty / stuck. */
    debtFreeOn: Date | null;
};

export type StrategyWin = 'interest' | 'time' | 'both' | 'tied' | 'none';

export type RankedPayoff = DebtPayoffResult & {
    key: PayoffStrategy;
    /** vs best interest among compared strategies (0 = joint best). */
    interestDelta: number;
    /** vs fewest months among compared strategies (0 = joint best). */
    monthsDelta: number;
    winsInterest: boolean;
    winsTime: boolean;
};

const MAX_MONTHS = 600;
const CLEAR_EPS = 0.5;

export function simulatePayoff(
    debts: ReadonlyArray<DebtPayoffInput>,
    strategy: PayoffStrategy,
    extraMonthly = 0
): DebtPayoffResult {
    if (debts.length === 0) {
        return { months: 0, interest: 0, debtFreeOn: null };
    }

    const list = debts.map(debt => ({
        balance: debt.balance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
    }));

    // Fixed pool so freed minimums keep attacking the remaining debts.
    const monthlyPool =
        list.reduce((total, debt) => total + debt.minimumPayment, 0) +
        (strategy === PayoffStrategy.MINIMAL ? 0 : Math.max(0, extraMonthly));

    let interest = 0;
    let months = 0;

    while (list.some(debt => debt.balance > CLEAR_EPS) && months < MAX_MONTHS) {
        months++;

        for (const debt of list) {
            if (debt.balance <= CLEAR_EPS) continue;
            const accrued = Math.round((debt.balance * debt.interestRate) / 100 / 12);
            debt.balance += accrued;
            interest += accrued;
        }

        if (strategy === PayoffStrategy.MINIMAL) {
            for (const debt of list) {
                if (debt.balance <= CLEAR_EPS) continue;
                debt.balance -= Math.min(debt.balance, debt.minimumPayment);
            }
        } else {
            let budget = monthlyPool;
            for (const debt of list) {
                if (debt.balance <= CLEAR_EPS) continue;
                const pay = Math.min(debt.balance, debt.minimumPayment);
                debt.balance -= pay;
                budget -= pay;
            }

            const open = list
                .filter(debt => debt.balance > CLEAR_EPS)
                .sort((left, right) =>
                    strategy === PayoffStrategy.SNOWBALL
                        ? left.balance - right.balance
                        : right.interestRate - left.interestRate
                );
            const target = open[0];
            if (target && budget > 0) {
                target.balance -= Math.min(target.balance, budget);
            }
        }

        for (const debt of list) {
            if (debt.balance < CLEAR_EPS) debt.balance = 0;
        }
    }

    if (months >= MAX_MONTHS && list.some(debt => debt.balance > CLEAR_EPS)) {
        return { months, interest, debtFreeOn: null };
    }

    const debtFreeOn = new Date();
    debtFreeOn.setDate(1);
    debtFreeOn.setMonth(debtFreeOn.getMonth() + months);

    return { months, interest, debtFreeOn };
}

/** Rank every strategy against the others so the UI can mark winners / deltas. */
export function rankPayoffStrategies(
    results: ReadonlyArray<{ key: PayoffStrategy } & DebtPayoffResult>
): RankedPayoff[] {
    const finite = results.filter(result => result.months > 0 && result.debtFreeOn);
    const bestInterest = finite.length
        ? Math.min(...finite.map(result => result.interest))
        : 0;
    const bestMonths = finite.length ? Math.min(...finite.map(result => result.months)) : 0;

    return results.map(result => {
        const ready = result.months > 0 && result.debtFreeOn !== null;
        const interestDelta = ready ? result.interest - bestInterest : 0;
        const monthsDelta = ready ? result.months - bestMonths : 0;
        return {
            ...result,
            interestDelta,
            monthsDelta,
            winsInterest: ready && interestDelta === 0,
            winsTime: ready && monthsDelta === 0,
        };
    });
}

export function strategyWinKind(ranked: RankedPayoff): StrategyWin {
    if (ranked.winsInterest && ranked.winsTime) return 'both';
    if (ranked.winsInterest) return 'interest';
    if (ranked.winsTime) return 'time';
    if (ranked.interestDelta === 0 && ranked.monthsDelta === 0) return 'tied';
    return 'none';
}

/** Sort open debts into the order the chosen strategy attacks them. */
export function orderDebtsByStrategy<T extends DebtPayoffInput>(
    debts: ReadonlyArray<T>,
    strategy: PayoffStrategy
): T[] {
    const list = [...debts];
    if (strategy === PayoffStrategy.SNOWBALL || strategy === PayoffStrategy.MINIMAL) {
        return list.sort((left, right) => left.balance - right.balance);
    }
    return list.sort((left, right) => right.interestRate - left.interestRate);
}

/**
 * True when Avalanche and Snowball attack debts in the same sequence — then
 * interest and freedom date are identical (not a simulator bug).
 */
export function payoffOrdersMatch<T extends DebtPayoffInput>(
    debts: ReadonlyArray<T>
): boolean {
    if (debts.length < 2) return true;
    const avalanche = orderDebtsByStrategy(debts, PayoffStrategy.AVALANCHE);
    const snowball = orderDebtsByStrategy(debts, PayoffStrategy.SNOWBALL);
    return avalanche.every((debt, index) => debt === snowball[index]);
}

export function formatDebtFreeMonth(date: Date | null): string {
    if (!date) return '—';
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

export function payoffStrategyLabel(strategy: PayoffStrategy): string {
    switch (strategy) {
        case PayoffStrategy.SNOWBALL:
            return 'Snowball';
        case PayoffStrategy.MINIMAL:
            return 'Minimal only';
        default:
            return 'Avalanche';
    }
}
