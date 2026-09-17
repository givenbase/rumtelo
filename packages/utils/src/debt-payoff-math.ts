/**
 * Shared debt payoff month-step math — used by the Debt UI simulator and
 * period-travel projections (`projectDebtsAtHorizon`).
 *
 * Keep this free of app/UI concerns so backend + client stay in lockstep.
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

export type DebtBalancesAfterMonths = {
    /** Months actually simulated (may be less than requested if cleared early). */
    monthsRun: number;
    totalRemaining: number;
    interest: number;
    balances: number[];
    cleared: boolean;
    /**
     * For each input debt: calendar month (1st) when that balance first hit zero
     * during this run; null if still open after `monthsRun`.
     */
    clearedOn: (Date | null)[];
    /** Months from now until clear (same index as input); null if not cleared in the run. */
    clearedAfterMonths: (number | null)[];
};

const MAX_MONTHS = 600;
const CLEAR_EPS = 0.5;

function cloneDebts(debts: ReadonlyArray<DebtPayoffInput>) {
    return debts.map(debt => ({
        balance: debt.balance,
        interestRate: debt.interestRate,
        minimumPayment: debt.minimumPayment,
    }));
}

function stepMonth(
    list: Array<{ balance: number; interestRate: number; minimumPayment: number }>,
    strategy: PayoffStrategy,
    monthlyPool: number
): number {
    let interest = 0;

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

    return interest;
}

function monthlyPoolFor(
    debts: ReadonlyArray<DebtPayoffInput>,
    strategy: PayoffStrategy,
    extraMonthly: number
): number {
    const mins = debts.reduce((total, debt) => total + debt.minimumPayment, 0);
    return mins + (strategy === PayoffStrategy.MINIMAL ? 0 : Math.max(0, extraMonthly));
}

/** Full run until clear (or MAX_MONTHS) — Debt screen strategies. */
export function simulatePayoff(
    debts: ReadonlyArray<DebtPayoffInput>,
    strategy: PayoffStrategy,
    extraMonthly = 0
): DebtPayoffResult {
    if (debts.length === 0) {
        return { months: 0, interest: 0, debtFreeOn: null };
    }

    const list = cloneDebts(debts);
    const monthlyPool = monthlyPoolFor(debts, strategy, extraMonthly);
    let interest = 0;
    let months = 0;

    while (list.some(debt => debt.balance > CLEAR_EPS) && months < MAX_MONTHS) {
        months++;
        interest += stepMonth(list, strategy, monthlyPool);
    }

    if (months >= MAX_MONTHS && list.some(debt => debt.balance > CLEAR_EPS)) {
        return { months, interest, debtFreeOn: null };
    }

    const debtFreeOn = new Date();
    debtFreeOn.setDate(1);
    debtFreeOn.setMonth(debtFreeOn.getMonth() + months);

    return { months, interest, debtFreeOn };
}

/**
 * Advance the payoff clock exactly `months` steps (Looking Ahead remaining).
 * `months <= 0` returns today's balances unchanged.
 * Also records when each debt first clears during the run.
 */
export function projectBalancesAfterMonths(
    debts: ReadonlyArray<DebtPayoffInput>,
    months: number,
    strategy: PayoffStrategy = PayoffStrategy.AVALANCHE,
    extraMonthly = 0,
    from: Date = new Date()
): DebtBalancesAfterMonths {
    if (debts.length === 0) {
        return {
            monthsRun: 0,
            totalRemaining: 0,
            interest: 0,
            balances: [],
            cleared: true,
            clearedOn: [],
            clearedAfterMonths: [],
        };
    }

    const list = cloneDebts(debts);
    const clearedAfterMonths: (number | null)[] = list.map(debt =>
        debt.balance <= CLEAR_EPS ? 0 : null
    );

    if (months <= 0) {
        const totalRemaining = list.reduce((total, debt) => total + debt.balance, 0);
        return {
            monthsRun: 0,
            totalRemaining,
            interest: 0,
            balances: list.map(debt => debt.balance),
            cleared: totalRemaining <= CLEAR_EPS,
            clearedOn: clearedAfterMonths.map(monthsToClear =>
                monthsToClear === null ? null : monthOn(from, monthsToClear)
            ),
            clearedAfterMonths,
        };
    }

    const monthlyPool = monthlyPoolFor(debts, strategy, extraMonthly);
    let interest = 0;
    let monthsRun = 0;
    const target = Math.min(Math.max(0, Math.floor(months)), MAX_MONTHS);

    while (monthsRun < target && list.some(debt => debt.balance > CLEAR_EPS)) {
        monthsRun++;
        interest += stepMonth(list, strategy, monthlyPool);
        for (let index = 0; index < list.length; index++) {
            if (clearedAfterMonths[index] === null && list[index]!.balance <= CLEAR_EPS) {
                clearedAfterMonths[index] = monthsRun;
            }
        }
    }

    const totalRemaining = list.reduce((total, debt) => total + debt.balance, 0);
    return {
        monthsRun,
        totalRemaining,
        interest,
        balances: list.map(debt => debt.balance),
        cleared: totalRemaining <= CLEAR_EPS,
        clearedOn: clearedAfterMonths.map(monthsToClear =>
            monthsToClear === null ? null : monthOn(from, monthsToClear)
        ),
        clearedAfterMonths,
    };
}

/** First of the month `months` after `from` (0 = this calendar month). */
function monthOn(from: Date, months: number): Date {
    const date = new Date(from.getFullYear(), from.getMonth(), 1);
    date.setMonth(date.getMonth() + months);
    return date;
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
