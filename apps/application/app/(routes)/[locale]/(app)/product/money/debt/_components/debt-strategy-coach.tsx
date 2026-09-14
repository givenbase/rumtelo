'use client';

import type { Debt } from '@rumtelo/contracts';
import { PayoffStrategy } from '@rumtelo/contracts';
import { cn } from '@rumtelo/utils';
import Link from 'next/link';

import {
    orderDebtsByStrategy,
    payoffOrdersMatch,
    payoffStrategyLabel,
    type RankedPayoff,
} from '@/app/_lib/debt-payoff';
import { settingsHref } from '@/app/_lib/settings-tabs';
import { CoachMark, HelperGate } from '@/components/features/helpers';

type StrategyOption = {
    key: PayoffStrategy;
    name: string;
    promise: string;
    rule: string;
} & RankedPayoff;

type DebtStrategyCoachProps = {
    debts: ReadonlyArray<Debt>;
    strategy: PayoffStrategy;
    comparisons: ReadonlyArray<StrategyOption>;
    hasExtra: boolean;
    extraLabel: string | null;
    formatMoney: (amount: number) => string;
};

const MONTH_SHORT = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
] as const;

function friendlyFreeDate(date: Date | null): string {
    if (!date) return 'Not sure yet';
    return `${MONTH_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

function delayInWords(months: number): string {
    if (months <= 0) return '';
    if (months === 1) return 'about 1 month later';
    if (months < 12) return `about ${months} months later`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return years === 1 ? 'about 1 year later' : `about ${years} years later`;
    if (years === 1) return `about 1 year and ${rem} months later`;
    return `about ${years} years and ${rem} months later`;
}

function soonerInWords(months: number): string {
    if (months <= 0) return '';
    if (months === 1) return 'about 1 month sooner';
    if (months < 12) return `about ${months} months sooner`;
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) return years === 1 ? 'about 1 year sooner' : `about ${years} years sooner`;
    if (years === 1) return `about 1 year and ${rem} months sooner`;
    return `about ${years} years and ${rem} months sooner`;
}

/**
 * Coach guide only — plain-language compare of all three methods.
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
    /** Avalanche & Snowball show the same totals right now. */
    const focusedMatch = sameAttackOrder || sameResults || !hasExtra;

    // RankedPayoff already compares every method — Minimal's deltas are "vs best plan".
    const saveVsMinimal = minimal?.interestDelta ?? 0;
    const monthsVsMinimal = minimal?.monthsDelta ?? 0;

    const recommendKey: PayoffStrategy | null = (() => {
        if (debts.length < 2) return null;
        const planWinners = comparisons.filter(
            option => option.key !== PayoffStrategy.MINIMAL && option.winsInterest
        );
        if (planWinners.some(option => option.key === PayoffStrategy.AVALANCHE)) {
            return PayoffStrategy.AVALANCHE;
        }
        return planWinners[0]?.key ?? PayoffStrategy.AVALANCHE;
    })();

    const onRecommended =
        recommendKey !== null &&
        (strategy === recommendKey || (focusedMatch && strategy === PayoffStrategy.SNOWBALL));

    const verdict = (() => {
        if (debts.length === 0) {
            return {
                headline: 'Add your debts first',
                body: 'Once they are listed, we can show which payoff style fits you.',
            };
        }
        if (debts.length === 1) {
            return {
                headline: 'One debt — any style is fine',
                body: 'With only one balance, Avalanche and Snowball do the same thing. Add another debt when you want a real compare.',
            };
        }
        if (!hasExtra) {
            return {
                headline: onRecommended
                    ? 'Good news: a plan beats minimums-only'
                    : 'You are on the slower path right now',
                body:
                    saveVsMinimal > 0
                        ? `Avalanche or Snowball both beat Minimums only here — about ${formatMoney(saveVsMinimal)} less interest${monthsVsMinimal > 0 ? `, and ${soonerInWords(monthsVsMinimal)}` : ''}.`
                        : 'Avalanche or Snowball usually beat Minimums only once you put any leftover toward debt.',
            };
        }
        if (focusedMatch) {
            const target = avalancheOrder[0]?.name ?? 'your first debt';
            return {
                headline: onRecommended
                    ? 'Avalanche and Snowball look the same for you'
                    : 'You could finish cheaper with Avalanche or Snowball',
                body: `Both hit ${target} first, so the totals match. ${
                    saveVsMinimal > 0
                        ? `Either one saves about ${formatMoney(saveVsMinimal)} versus Minimums only.`
                        : 'Either is usually better than Minimums only unless money is truly tight.'
                }`,
            };
        }
        const avName = avalancheOrder[0]?.name;
        const snName = snowballOrder[0]?.name;
        const moneyWinner = payoffStrategyLabel(recommendKey ?? PayoffStrategy.AVALANCHE);
        return {
            headline: onRecommended
                ? `${moneyWinner} is the cheapest for you`
                : `Switching to ${moneyWinner} would cost you less`,
            body: [
                avName && snName
                    ? `Extra money (${extraLabel ?? 'your extra'}) goes to ${avName} with Avalanche, or ${snName} with Snowball.`
                    : null,
                saveVsMinimal > 0
                    ? `${moneyWinner} saves about ${formatMoney(saveVsMinimal)} versus Minimums only.`
                    : null,
                'Pick Avalanche if you care most about paying less interest. Pick Snowball if clearing a smaller debt first keeps you motivated.',
            ]
                .filter(Boolean)
                .join(' '),
        };
    })();

    return (
        <HelperGate>
            <section
                className="grid gap-4 rounded-2xl border border-accent/20 bg-surface p-4 shadow-sm ring-1 ring-accent/10 lg:p-5"
                data-coach-guide="debt-strategy"
                aria-label="The Coach: debt payoff methods">
                <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                            Compare methods
                        </span>
                    </div>

                    <div className="rounded-xl border border-accent/25 bg-accent-soft/40 px-3.5 py-3">
                        <p className="text-sm font-medium text-pretty text-fg">
                            {verdict.headline}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-pretty text-fg-secondary">
                            {verdict.body}
                        </p>
                        <p className="mt-2 text-xs leading-relaxed text-fg-muted">
                            You use{' '}
                            <span className="font-medium text-fg">
                                {payoffStrategyLabel(strategy)}
                            </span>{' '}
                            today.{' '}
                            <Link
                                href={settingsHref('debt')}
                                className="font-medium text-accent underline-offset-2 hover:underline">
                                Change method in Settings
                            </Link>
                            . This page only explains — it does not switch it for you.
                        </p>
                    </div>

                    {!hasExtra && debts.length > 1 ? (
                        <p className="text-xs leading-relaxed text-pretty text-fg-muted">
                            Avalanche and Snowball look identical in the € totals below because{' '}
                            <span className="font-medium text-fg">Extra /mo is none</span>. Those
                            two methods only choose where leftover money goes — try a small Extra
                            /mo above to see them split. The cards still differ in which debt they
                            would attack first.
                        </p>
                    ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                    {comparisons.map(option => {
                        const isYours = option.key === strategy;
                        const isCoachPick = recommendKey !== null && option.key === recommendKey;
                        const isPlan =
                            option.key === PayoffStrategy.AVALANCHE ||
                            option.key === PayoffStrategy.SNOWBALL;
                        const firstTarget =
                            option.key === PayoffStrategy.MINIMAL
                                ? null
                                : orderDebtsByStrategy(debts, option.key)[0];

                        const whenToPick =
                            option.key === PayoffStrategy.AVALANCHE
                                ? 'Pick this if you want to pay the least interest over time.'
                                : option.key === PayoffStrategy.SNOWBALL
                                  ? 'Pick this if knocking out a small debt first helps you stick with it.'
                                  : 'Pick this only if you truly cannot put anything extra toward debt.';

                        const howItWorks =
                            option.key === PayoffStrategy.AVALANCHE
                                ? 'Puts leftover money on the highest interest debt first.'
                                : option.key === PayoffStrategy.SNOWBALL
                                  ? 'Puts leftover money on the smallest balance first.'
                                  : 'Each debt only gets its minimum. Nothing leftover, nothing moved over.';

                        const plainOutcome = (() => {
                            if (option.key === PayoffStrategy.MINIMAL) {
                                if (saveVsMinimal > 0) {
                                    return `Costs about ${formatMoney(saveVsMinimal)} more in interest`;
                                }
                                return 'Slowest option';
                            }
                            if (focusedMatch && isPlan) {
                                if (isCoachPick && saveVsMinimal > 0) {
                                    return `Same € as Snowball today · saves about ${formatMoney(saveVsMinimal)} vs minimums only`;
                                }
                                if (option.key === PayoffStrategy.SNOWBALL) {
                                    return 'Same € as Avalanche today · different first debt';
                                }
                                return 'Same € as Snowball today · different first debt';
                            }
                            if (isCoachPick && saveVsMinimal > 0) {
                                return `Saves about ${formatMoney(saveVsMinimal)} vs minimums only`;
                            }
                            if (option.winsInterest && option.winsTime) {
                                return 'Cheapest and soonest for you';
                            }
                            if (option.winsInterest) return 'Pays the least interest';
                            if (option.winsTime) return 'Gets you free soonest';
                            if (option.interestDelta > 0) {
                                return `About ${formatMoney(option.interestDelta)} more interest than the cheapest`;
                            }
                            return 'A solid choice';
                        })();

                        return (
                            <div
                                key={option.key}
                                className={cn(
                                    'rounded-lg border border-l-4 bg-raised p-3.5 text-left',
                                    // Only the household method reads as “active”.
                                    isYours
                                        ? 'border-accent/40 border-l-accent ring-1 ring-accent/15'
                                        : 'border-line border-l-fg-muted/35'
                                )}>
                                <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                                    <div className="grid gap-0.5">
                                        <span
                                            className={cn(
                                                'font-mono text-[10px] font-medium tracking-wide uppercase',
                                                isYours ? 'text-accent' : 'text-fg-muted'
                                            )}>
                                            {option.name}
                                        </span>
                                        <span className="text-sm font-medium text-pretty text-fg">
                                            {whenToPick}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        {isYours ? (
                                            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[9px] tracking-widest text-accent uppercase">
                                                What you use
                                            </span>
                                        ) : isCoachPick ? (
                                            <span className="font-mono text-[9px] tracking-widest text-fg-secondary uppercase">
                                                Coach tip · best for cost
                                            </span>
                                        ) : null}
                                    </div>
                                </div>

                                <p className="mb-2 text-[12px] leading-snug text-pretty text-fg-muted">
                                    {howItWorks}
                                </p>

                                {firstTarget ? (
                                    <div className="mb-3 rounded-md bg-surface px-2.5 py-2">
                                        <div className="text-[11px] text-fg-muted">
                                            Would attack first
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg">
                                            {firstTarget.name}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-fg-faint">
                                            {firstTarget.interestRate}% interest ·{' '}
                                            {formatMoney(firstTarget.balance)} left
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                                    <div>
                                        <div className="text-[11px] text-fg-muted">
                                            Interest you pay
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg tabular-nums">
                                            {formatMoney(option.interest)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-fg-muted">
                                            Debt-free around
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg tabular-nums">
                                            {friendlyFreeDate(option.debtFreeOn)}
                                        </div>
                                        {option.monthsDelta > 0 ? (
                                            <div className="mt-0.5 text-[11px] text-fg-faint">
                                                {delayInWords(option.monthsDelta)}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>

                                <p className="mt-2.5 text-xs font-medium text-pretty text-fg-secondary">
                                    {plainOutcome}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </section>
        </HelperGate>
    );
}
