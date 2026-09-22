'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo } from 'react';

import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { AccentCard, Button, Card, Eyebrow, Typography } from '@rumtelo/ui';
import {
    incomeDelta,
    monthlyNetAsOf,
    describePeriodTravel,
    endOfPeriodIso,
    horizonMonths,
    toPeriodKey,
} from '@rumtelo/utils';

import { useTranslations } from '@rumtelo/i18n';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { IncomeSimulator } from '@/components/features/growth/income-simulator';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

/** Demo fallback when no ACTIVE EARN goal is set. */
const FALLBACK_TARGET = 600_000;

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function dayBefore(iso: string): string {
    const date = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 1);
    return date.toISOString().slice(0, 10);
}

export function IncomePageClient() {
    const t = useTranslations('features.growth.income');
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const travel = describePeriodTravel(period);
    const horizon = horizonMonths(travel);
    const traveling = travel.direction !== 'current';
    const live = isLiveData(householdId);

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const allSources = incomeQuery.data ?? [];
    const sources = allSources.filter(source => source.isActive);
    const netNow = monthlyNetAsOf(sources, todayIso());
    const netAsOf = monthlyNetAsOf(sources, endOfPeriodIso(periodKey));
    const monthlyNet = travel.direction === 'past' ? netAsOf : netNow;
    const spanNet = traveling ? monthlyNet * horizon : monthlyNet;
    const jars = jarsQuery.data ?? [];

    const earnBar = useMemo(() => {
        const earn = (goalsQuery.data ?? []).filter(
            goal =>
                goal.kind === GoalKind.EARN &&
                goal.target > 0 &&
                (goal.status === GoalStatus.ACTIVE || goal.status === GoalStatus.REACHED)
        );
        const open = earn.filter(goal => goal.status === GoalStatus.ACTIVE);
        const reached = earn.filter(goal => goal.status === GoalStatus.REACHED);
        // A reached bar still is the target. Dropping it showed the €6,000 demo number.
        const pool = open.length > 0 ? open : reached;
        const amount =
            pool.length > 0 ? Math.max(...pool.map(goal => goal.target)) : FALLBACK_TARGET;
        const cleared = pool.find(
            goal => goal.target === amount && goal.status === GoalStatus.REACHED
        );
        return {
            target: amount,
            clearedName: open.length === 0 && cleared ? cleared.name : null,
        };
    }, [goalsQuery.data]);
    const target = earnBar.target;
    const saveGoals = useMemo(
        () =>
            (goalsQuery.data ?? []).filter(goal => (goal.kind ?? GoalKind.SAVE) === GoalKind.SAVE),
        [goalsQuery.data]
    );

    const gap = target - monthlyNet;

    const newestEffective = sources
        .flatMap(source => source.periods ?? [])
        .map(amountPeriod => amountPeriod.effectiveOn.slice(0, 10))
        .sort()
        .at(-1);
    const delta =
        newestEffective !== undefined
            ? incomeDelta(
                  monthlyNetAsOf(sources, dayBefore(newestEffective)),
                  monthlyNetAsOf(sources, todayIso())
              )
            : null;

    return (
        <div className="grid animate-rise gap-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <Typography as="span" variant="eyebrow" color="primary">
                        {t('page_eyebrow')}
                    </Typography>
                    <Typography as="h1" className="mt-1 text-2xl sm:text-3xl lg:text-3xl">
                        {t('page_title')}
                    </Typography>
                </div>
                <Button as={Link} href={CREATE_HREF.income} size="sm">
                    {t('add_income')}
                </Button>
            </div>

            <div className="grid gap-4">
                <div data-tour="income-summary" className="min-w-0">
                    <AccentCard
                        tint="var(--color-accent)"
                        className="grid h-full content-center gap-4 p-4 sm:p-5">
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="grid gap-1">
                                <Eyebrow>
                                    {travel.direction === 'future'
                                        ? t('through_then')
                                        : travel.direction === 'past'
                                          ? t('then_label')
                                          : t('now')}
                                </Eyebrow>
                                <p className="font-display text-2xl leading-none font-semibold tracking-tight text-fg sm:text-3xl">
                                    {traveling ? (
                                        <>
                                            <span className="text-fg-faint">
                                                {formatMoney(monthlyNet)}
                                            </span>
                                            <span className="mx-1 text-fg-faint">→</span>
                                            <span className="text-success">
                                                {formatMoney(spanNet)}
                                            </span>
                                        </>
                                    ) : (
                                        formatMoney(monthlyNet)
                                    )}
                                </p>
                                <p className="font-mono text-[11px] leading-snug text-fg-muted">
                                    {traveling
                                        ? t('subline_travel', {
                                              amount: formatMoney(monthlyNet),
                                              months: horizon,
                                          })
                                        : t('subline_annual', {
                                              amount: formatMoney(monthlyNet * 12),
                                          })}
                                    {delta && delta.absolute !== 0 && !traveling ? (
                                        <>
                                            <br />
                                            <span
                                                className={
                                                    delta.absolute > 0
                                                        ? 'text-success'
                                                        : 'text-warning'
                                                }>
                                                {delta.absolute > 0 ? '+' : ''}
                                                {formatMoney(delta.absolute)}
                                            </span>
                                        </>
                                    ) : null}
                                </p>
                            </div>
                            <div className="grid gap-1">
                                <Eyebrow>{t('target')}</Eyebrow>
                                <p
                                    className="font-display text-2xl leading-none font-semibold tracking-tight sm:text-3xl"
                                    style={{
                                        background: 'var(--gradient-accent)',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}>
                                    {formatMoney(target)}
                                </p>
                                <p className="font-mono text-[11px] text-fg-muted">{t('mo_net')}</p>
                            </div>
                            <div className="grid gap-1">
                                <Eyebrow>{t('gap')}</Eyebrow>
                                <p
                                    className={`font-display text-2xl leading-none font-semibold tracking-tight sm:text-3xl ${
                                        gap < 0 ? 'text-success' : 'text-warning'
                                    }`}>
                                    {gap < 0 ? `+${formatMoney(-gap)}` : formatMoney(gap)}
                                </p>
                                <p className="font-mono text-[11px] text-fg-muted">
                                    {gap < 0
                                        ? t('gap_over')
                                        : gap === 0
                                          ? t('gap_met')
                                          : t('gap_to_go')}
                                </p>
                            </div>
                        </div>
                    </AccentCard>
                </div>

                <div data-tour="income-simulator" className="min-w-0">
                    <IncomeSimulator
                        netCents={monthlyNet}
                        targetCents={target}
                        clearedName={!traveling && gap <= 0 ? earnBar.clearedName : null}
                        jars={jars}
                        goals={saveGoals}
                    />
                </div>
            </div>

            <div data-tour="income-sources">
                <Card className="p-0">
                    <div className="border-b border-line px-4 py-2.5 sm:px-5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            {t('sources_heading')}
                        </Typography>
                    </div>
                    {sources.length === 0 ? (
                        <p className="px-4 py-3.5 text-sm text-fg-muted sm:px-5">
                            {live ? t('empty_live') : t('empty_guest')}
                        </p>
                    ) : (
                        <div className="grid gap-px">
                            {sources.map(source => (
                                <Link
                                    key={source.id}
                                    href={updateHref('income', source.id)}
                                    className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 text-left last:border-b-0 hover:bg-raised sm:px-5 sm:py-3">
                                    <div>
                                        <div className="text-sm text-fg">{source.name}</div>
                                        <div className="mt-0.5 font-mono text-xs tracking-normal text-fg-faint">
                                            {source.kind}
                                        </div>
                                    </div>
                                    <span className="font-mono text-sm text-success">
                                        {formatMoney(source.amount)}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
