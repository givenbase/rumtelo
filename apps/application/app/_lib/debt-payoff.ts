/**
 * Client-side debt payoff simulator — used on the Debt screen to compare
 * Avalanche, Snowball, and Minimal.
 *
 * Core month-step math lives in `@rumtelo/utils` so period-travel projections
 * stay aligned with this UI.
 */

import type { Debt } from '@rumtelo/contracts';
import { PayoffStrategy } from '@rumtelo/contracts';
import type { TranslateFn } from '@rumtelo/i18n';
import {
    orderDebtsByStrategy as orderDebtsByStrategyShared,
    simulatePayoff as simulatePayoffShared,
    type DebtPayoffResult as SharedDebtPayoffResult,
} from '@rumtelo/utils';

export type DebtPayoffInput = Pick<Debt, 'balance' | 'interestRate' | 'minimumPayment'>;

export type DebtPayoffResult = SharedDebtPayoffResult;

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

export function simulatePayoff(
    debts: ReadonlyArray<DebtPayoffInput>,
    strategy: PayoffStrategy,
    extraMonthly = 0
): DebtPayoffResult {
    return simulatePayoffShared(debts, strategy, extraMonthly);
}

/** Rank every strategy against the others so the UI can mark winners / deltas. */
export function rankPayoffStrategies(
    results: ReadonlyArray<{ key: PayoffStrategy } & DebtPayoffResult>
): RankedPayoff[] {
    const finite = results.filter(result => result.months > 0 && result.debtFreeOn);
    const bestInterest = finite.length ? Math.min(...finite.map(result => result.interest)) : 0;
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
    return orderDebtsByStrategyShared(debts, strategy);
}

/**
 * True when Avalanche and Snowball attack debts in the same sequence — then
 * interest and freedom date are identical (not a simulator bug).
 */
export function payoffOrdersMatch(debts: ReadonlyArray<DebtPayoffInput>): boolean {
    if (debts.length < 2) return true;
    const avalanche = orderDebtsByStrategy(debts, PayoffStrategy.AVALANCHE);
    const snowball = orderDebtsByStrategy(debts, PayoffStrategy.SNOWBALL);
    return avalanche.every((debt, index) => debt === snowball[index]);
}

export function formatDebtFreeMonth(date: Date | null): string {
    if (!date) return '—';
    return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

/** Display month for a clear date — e.g. "Oct 2026". */
export function formatClearedMonth(date: Date | null, locale: string): string {
    if (!date) return '—';
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

/** Scoped to `features.money.debt` when `t` is passed. */
export function payoffStrategyLabel(strategy: PayoffStrategy, t?: TranslateFn): string {
    if (t) {
        switch (strategy) {
            case PayoffStrategy.SNOWBALL:
                return t('strategy_snowball');
            case PayoffStrategy.MINIMAL:
                return t('strategy_minimal');
            default:
                return t('strategy_avalanche');
        }
    }
    switch (strategy) {
        case PayoffStrategy.SNOWBALL:
            return 'Snowball';
        case PayoffStrategy.MINIMAL:
            return 'Minimal only';
        default:
            return 'Avalanche';
    }
}
