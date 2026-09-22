'use client';

import type { Debt } from '@rumtelo/contracts';
import { PayoffStrategy } from '@rumtelo/contracts';
import { useTranslations, type TranslateFn } from '@rumtelo/i18n';
import { cn } from '@rumtelo/utils';
import Link from 'next/link';
import { useLocale } from 'next-intl';

import { orderDebtsByStrategy, payoffOrdersMatch, type RankedPayoff } from '@/app/_lib/debt-payoff';
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

function strategyLabel(strategy: PayoffStrategy, tDebt: TranslateFn): string {
    switch (strategy) {
        case PayoffStrategy.SNOWBALL:
            return tDebt('strategy_snowball');
        case PayoffStrategy.MINIMAL:
            return tDebt('strategy_minimal');
        default:
            return tDebt('strategy_avalanche');
    }
}

function friendlyFreeDate(date: Date | null, locale: string, t: TranslateFn): string {
    if (!date) return t('not_sure_yet');
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(date);
}

function delayInWords(months: number, t: TranslateFn): string {
    if (months <= 0) return '';
    if (months === 1) return t('delay_1_month');
    if (months < 12) return t('delay_months', { months });
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) {
        return years === 1 ? t('delay_1_year') : t('delay_years', { years });
    }
    if (years === 1) return t('delay_1_year_months', { months: rem });
    return t('delay_years_months', { years, months: rem });
}

function soonerInWords(months: number, t: TranslateFn): string {
    if (months <= 0) return '';
    if (months === 1) return t('sooner_1_month');
    if (months < 12) return t('sooner_months', { months });
    const years = Math.floor(months / 12);
    const rem = months % 12;
    if (rem === 0) {
        return years === 1 ? t('sooner_1_year') : t('sooner_years', { years });
    }
    if (years === 1) return t('sooner_1_year_months', { months: rem });
    return t('sooner_years_months', { years, months: rem });
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
    const tDebt = useTranslations('features.money.debt');
    const t = useTranslations('features.money.debt.strategy_coach');
    const locale = useLocale();

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
                headline: t('verdict_add_debts_title'),
                body: t('verdict_add_debts_body'),
            };
        }
        if (debts.length === 1) {
            return {
                headline: t('verdict_one_debt_title'),
                body: t('verdict_one_debt_body'),
            };
        }
        if (!hasExtra) {
            const soonerPart =
                monthsVsMinimal > 0
                    ? t('sooner_suffix', { sooner: soonerInWords(monthsVsMinimal, t) })
                    : '';
            return {
                headline: onRecommended
                    ? t('verdict_good_plan_title')
                    : t('verdict_slow_path_title'),
                body:
                    saveVsMinimal > 0
                        ? t('verdict_beat_minimums', {
                              amount: formatMoney(saveVsMinimal),
                              sooner: soonerPart,
                          })
                        : t('verdict_beat_minimums_fallback'),
            };
        }
        if (focusedMatch) {
            const target = avalancheOrder[0]?.name ?? t('first_debt_fallback');
            const savings =
                saveVsMinimal > 0
                    ? t('verdict_same_savings', { amount: formatMoney(saveVsMinimal) })
                    : t('verdict_same_fallback');
            return {
                headline: onRecommended ? t('verdict_same_title') : t('verdict_cheaper_title'),
                body: t('verdict_same_body', { target, savings }),
            };
        }
        const avName = avalancheOrder[0]?.name;
        const snName = snowballOrder[0]?.name;
        const moneyWinner = strategyLabel(recommendKey ?? PayoffStrategy.AVALANCHE, tDebt);
        return {
            headline: onRecommended
                ? t('verdict_cheapest_title', { strategy: moneyWinner })
                : t('verdict_switch_title', { strategy: moneyWinner }),
            body: [
                avName && snName
                    ? t('verdict_extra_split', {
                          extra: extraLabel ?? t('extra_fallback'),
                          avalancheTarget: avName,
                          snowballTarget: snName,
                      })
                    : null,
                saveVsMinimal > 0
                    ? t('verdict_strategy_saves', {
                          strategy: moneyWinner,
                          amount: formatMoney(saveVsMinimal),
                      })
                    : null,
                t('verdict_pick_hint'),
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
                aria-label={t('aria_label')}>
                <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <span className="font-mono text-[10px] font-bold tracking-[0.14em] text-accent uppercase">
                            {t('compare_methods')}
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
                            {t('you_use', { strategy: strategyLabel(strategy, tDebt) })}{' '}
                            <Link
                                href={settingsHref('debt')}
                                className="font-medium text-accent underline-offset-2 hover:underline">
                                {t('change_settings')}
                            </Link>
                            . {t('explain_only')}
                        </p>
                    </div>

                    {!hasExtra && debts.length > 1 ? (
                        <p className="text-xs leading-relaxed text-pretty text-fg-muted">
                            {t('no_extra_hint')}
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
                                ? t('when_avalanche')
                                : option.key === PayoffStrategy.SNOWBALL
                                  ? t('when_snowball')
                                  : t('when_minimal');

                        const howItWorks =
                            option.key === PayoffStrategy.AVALANCHE
                                ? t('how_avalanche')
                                : option.key === PayoffStrategy.SNOWBALL
                                  ? t('how_snowball')
                                  : t('how_minimal');

                        const plainOutcome = (() => {
                            if (option.key === PayoffStrategy.MINIMAL) {
                                if (saveVsMinimal > 0) {
                                    return t('outcome_costs_more', {
                                        amount: formatMoney(saveVsMinimal),
                                    });
                                }
                                return t('outcome_slowest');
                            }
                            if (focusedMatch && isPlan) {
                                if (isCoachPick && saveVsMinimal > 0) {
                                    return t('outcome_same_snowball_saves', {
                                        amount: formatMoney(saveVsMinimal),
                                    });
                                }
                                if (option.key === PayoffStrategy.SNOWBALL) {
                                    return t('outcome_same_different_debt');
                                }
                                return t('outcome_same_avalanche');
                            }
                            if (isCoachPick && saveVsMinimal > 0) {
                                return t('outcome_saves', { amount: formatMoney(saveVsMinimal) });
                            }
                            if (option.winsInterest && option.winsTime) {
                                return t('outcome_cheapest_soonest');
                            }
                            if (option.winsInterest) return t('outcome_least_interest');
                            if (option.winsTime) return t('outcome_free_soonest');
                            if (option.interestDelta > 0) {
                                return t('outcome_more_interest', {
                                    amount: formatMoney(option.interestDelta),
                                });
                            }
                            return t('outcome_solid');
                        })();

                        return (
                            <div
                                key={option.key}
                                className={cn(
                                    'rounded-lg border border-l-4 bg-raised p-3.5 text-left',
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
                                                {t('badge_yours')}
                                            </span>
                                        ) : isCoachPick ? (
                                            <span className="font-mono text-[9px] tracking-widest text-fg-secondary uppercase">
                                                {t('badge_coach_pick')}
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
                                            {t('attack_first')}
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg">
                                            {firstTarget.name}
                                        </div>
                                        <div className="mt-0.5 text-[11px] text-fg-faint">
                                            {t('interest_left', {
                                                rate: firstTarget.interestRate,
                                                balance: formatMoney(firstTarget.balance),
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="grid grid-cols-2 gap-2 border-t border-line pt-2.5">
                                    <div>
                                        <div className="text-[11px] text-fg-muted">
                                            {t('interest_pay')}
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg tabular-nums">
                                            {formatMoney(option.interest)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] text-fg-muted">
                                            {t('debt_free_around')}
                                        </div>
                                        <div className="mt-0.5 text-sm text-fg tabular-nums">
                                            {friendlyFreeDate(option.debtFreeOn, locale, t)}
                                        </div>
                                        {option.monthsDelta > 0 ? (
                                            <div className="mt-0.5 text-[11px] text-fg-faint">
                                                {delayInWords(option.monthsDelta, t)}
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
