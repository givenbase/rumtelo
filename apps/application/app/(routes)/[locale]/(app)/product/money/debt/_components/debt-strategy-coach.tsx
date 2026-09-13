'use client';

import { PayoffStrategy } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';

import {
    formatDebtFreeMonth,
    orderDebtsByStrategy,
    payoffOrdersMatch,
    payoffStrategyLabel,
    type RankedPayoff,
} from '@/app/_lib/debt-payoff';
import { CoachMark, HelperGate } from '@/components/features/helpers';

type DebtRow = {
    id: string;
    name: string;
    balance: number;
    interestRate: number;
    minimumPayment: number;
};

type StrategyOption = {
    key: PayoffStrategy;
    name: string;
    promise: string;
    rule: string;
} & RankedPayoff;

type DebtStrategyCoachProps = {
    debts: ReadonlyArray<DebtRow>;
    strategy: PayoffStrategy;
    comparisons: ReadonlyArray<StrategyOption>;
    hasExtra: boolean;
    extraLabel: string | null;
    formatMoney: (amount: number) => string;
};

/**
 * Coach guide only — compares methods with live numbers.
 * Does not change the household setting (that lives in Settings → Debt).
 */
export function DebtStrategyCoach({
    debts,
    strategy,
    comparisons,
    hasExtra,
    extraLabel,
    formatMoney,
}: DebtStrategyCoachProps) {
    const avalanche = comparisons.find(option => option.key === PayoffStrategy.AVALANCHE);
    const snowball = comparisons.find(option => option.key === PayoffStrategy.SNOWBALL);
    const minimal = comparisons.find(option => option.key === PayoffStrategy.MINIMAL);
    const avalancheOrder = orderDebtsByStrategy(debts, PayoffStrategy.AVALANCHE);
    const snowballOrder = orderDebtsByStrategy(debts, PayoffStrategy.SNOWBALL);
    const sameAttackOrder = payoffOrdersMatch(debts);
    const sameResults =
        Boolean(avalanche && snowball) &&
        avalanche!.interest === snowball!.interest &&
        avalanche!.months === snowball!.months;
    const collapseFocused = sameAttackOrder || sameResults || !hasExtra;

    const intro = (() => {
        if (debts.length === 0) {
            return 'Add debts first — then we can show where extra would go.';
        }
        if (debts.length === 1) {
            return 'With one debt every method lands in the same place. Add a second debt to compare.';
        }
        if (!hasExtra) {
            return 'Right now there is no extra payment to aim. Avalanche and Snowball only split once you add extra on top of minimums — until then they match, and Minimal is the slower baseline.';
        }
        if (sameAttackOrder && avalancheOrder[0]) {
            return `${avalancheOrder[0].name} is both highest rate and smallest balance, so Avalanche and Snowball run the same months. The real fork is vs Minimal.`;
        }
        if (sameResults) {
            return 'With your numbers Avalanche and Snowball finish the same. Minimal is the different path.';
        }
        const av = avalancheOrder[0]?.name;
        const sn = snowballOrder[0]?.name;
        if (av && sn && avalanche && snowball && minimal) {
            return `After minimums, ${extraLabel ?? 'extra'} goes to #1: Avalanche → ${av}, Snowball → ${sn}. Beating Minimal can save about ${formatMoney(Math.max(0, minimal.interest - Math.min(avalanche.interest, snowball.interest)))}.`;
        }
        return 'Pay every minimum. The method only chooses where extra goes next.';
    })();

    const cards = collapseFocused
        ? comparisons.filter(
              option =>
                  option.key === PayoffStrategy.MINIMAL ||
                  option.key ===
                      (strategy === PayoffStrategy.SNOWBALL
                          ? PayoffStrategy.SNOWBALL
                          : PayoffStrategy.AVALANCHE)
          )
        : comparisons;

    return (
        <HelperGate>
            <section
                className="grid gap-3 rounded-2xl border border-accent/20 bg-surface p-4 shadow-sm ring-1 ring-accent/10 lg:p-5"
                data-coach-guide="debt-strategy"
                aria-label="The Coach: debt payoff methods">
                <div className="grid gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                            Compare methods
                        </span>
                    </div>
                    <p className="max-w-2xl text-sm leading-relaxed text-pretty text-fg-secondary">
                        {intro}
                    </p>
                    <p className="text-xs text-fg-muted">
                        Your household uses{' '}
                        <span className="font-medium text-fg">{payoffStrategyLabel(strategy)}</span>
                        . Change it via Settings — this guide only explains the numbers.
                    </p>
                </div>

                <div
                    className={cn(
                        'grid gap-2',
                        collapseFocused ? 'sm:grid-cols-2' : 'sm:grid-cols-3'
                    )}>
                    {cards.map(option => {
                        const isYours =
                            collapseFocused && option.key !== PayoffStrategy.MINIMAL
                                ? strategy !== PayoffStrategy.MINIMAL
                                : option.key === strategy;
                        const firstTarget =
                            option.key === PayoffStrategy.MINIMAL
                                ? null
                                : orderDebtsByStrategy(debts, option.key)[0];
                        const isFocusedBundle =
                            collapseFocused && option.key !== PayoffStrategy.MINIMAL;
                        const title = isFocusedBundle
                            ? hasExtra
                                ? 'Focused payoff'
                                : 'With minimums + rollover'
                            : option.name;
                        const promise = isFocusedBundle
                            ? hasExtra
                                ? 'Put extra on #1 until it is gone'
                                : 'Same path until you add extra'
                            : option.promise;
                        const rule = isFocusedBundle
                            ? !hasExtra
                                ? 'Avalanche and Snowball need extra money to aim. Without it they clear in the same months — only Minimal skips rollover.'
                                : `Avalanche and Snowball both land on ${firstTarget?.name ?? 'the same debt'} first with your list.`
                            : option.rule;
                        const outcome = (() => {
                            if (option.key === PayoffStrategy.MINIMAL) {
                                return option.interestDelta > 0
                                    ? `Costs ${formatMoney(option.interestDelta)} more`
                                    : 'Baseline';
                            }
                            if (collapseFocused) {
                                return `Saves ${formatMoney(minimal?.interestDelta ?? 0)} vs Minimal`;
                            }
                            if (option.winsInterest && option.winsTime) return 'Cheapest & soonest';
                            if (option.winsInterest) return 'Cheapest interest';
                            if (option.winsTime) return 'Soonest free';
                            if (option.interestDelta > 0) {
                                return `+${formatMoney(option.interestDelta)} vs best`;
                            }
                            return 'Solid pick';
                        })();

                        return (
                            <div
                                key={option.key}
                                className={cn(
                                    'rounded-lg border border-l-4 bg-raised p-3.5 text-left',
                                    isYours
                                        ? 'border-accent/40 border-l-accent ring-1 ring-accent/15'
                                        : 'border-line border-l-fg-muted/40'
                                )}>
                                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                    <div className="grid gap-0.5">
                                        <span
                                            className={cn(
                                                'font-mono text-[10px] font-medium tracking-wide uppercase',
                                                isYours ? 'text-accent' : 'text-fg-muted'
                                            )}>
                                            {title}
                                        </span>
                                        <span className="text-sm font-medium text-fg">
                                            {promise}
                                        </span>
                                    </div>
                                    {isYours ? (
                                        <span className="font-mono text-[9px] tracking-[0.12em] text-accent uppercase">
                                            Your method
                                        </span>
                                    ) : null}
                                </div>
                                <p className="mb-2 text-[11px] leading-snug text-pretty text-fg-muted">
                                    {rule}
                                </p>
                                <div className="mb-2.5 rounded-md bg-surface px-2.5 py-2">
                                    <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                        Extra goes to
                                    </div>
                                    <div className="mt-0.5 text-sm text-fg">
                                        {firstTarget
                                            ? firstTarget.name
                                            : !hasExtra && option.key !== PayoffStrategy.MINIMAL
                                              ? 'No extra yet'
                                              : 'Nowhere — mins only'}
                                    </div>
                                    {firstTarget && hasExtra ? (
                                        <div className="mt-0.5 font-mono text-[10px] text-fg-faint">
                                            {firstTarget.interestRate}% ·{' '}
                                            {formatMoney(firstTarget.balance)} left
                                        </div>
                                    ) : null}
                                </div>
                                <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                                    <div>
                                        <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                            Interest
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-0.5 font-mono text-xs tabular-nums',
                                                option.winsInterest ? 'text-accent' : 'text-fg'
                                            )}>
                                            {formatMoney(option.interest)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-mono text-[9px] tracking-wider text-fg-faint uppercase">
                                            Debt-free
                                        </div>
                                        <div
                                            className={cn(
                                                'mt-0.5 font-mono text-xs tabular-nums',
                                                option.winsTime ? 'text-accent' : 'text-fg'
                                            )}>
                                            {formatDebtFreeMonth(option.debtFreeOn)}
                                        </div>
                                        {option.monthsDelta > 0 ? (
                                            <div className="mt-0.5 font-mono text-[10px] text-fg-faint">
                                                +{option.monthsDelta} mo
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                                <p className="mt-2 font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                    {outcome}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </HelperGate>
    );
}
