'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import { GoalKind, GoalStatus, JarKey, TransactionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, Eyebrow, Meter, Section } from '@rumtelo/ui';
import { monthlyAmount } from '@rumtelo/utils';

import { createFixedHref, createGoalHref, updateHref } from '@/app/_lib/create-routes';
import { WHY_GIVE } from '@/app/_lib/giving';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { CoachTipCard } from '@/components/features/helpers';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const EMPTY_TRANSACTION_PAGE = { items: [] as never[], nextCursor: null };

function yearStartIso(): string {
    return `${new Date().getUTCFullYear()}-01-01`;
}

/**
 * Soul → Giving. Money owns the flow (jar, fixed cost, ledger); this page owns the
 * meaning: why the Give jar exists, where it goes, and how to choose a place well.
 */
export function GivingPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        [],
        live
    );
    const giveJar = useMemo(
        () => (jarsQuery.data ?? []).find(jar => jar.key === JarKey.GIVE) ?? null,
        [jarsQuery.data]
    );

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const pledge = useMemo(() => {
        const rows = (goalsQuery.data ?? []) as ReadonlyArray<{
            id: string;
            kind?: string;
            status?: string;
            name: string;
            target: number;
            saved: number;
            monthlyContribution: number;
            targetOn?: string | null;
            fulfilledOn?: string | null;
        }>;
        const give = rows.filter(goal => goal.kind === GoalKind.GIVE);
        return (
            give.find(goal => goal.status === GoalStatus.ACTIVE) ??
            give.find(goal => goal.status === GoalStatus.REACHED) ??
            null
        );
    }, [goalsQuery.data]);

    const fixedQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const giveFixed = useMemo(() => {
        const group = (fixedQuery.data ?? []).find(row => row.jarKey === JarKey.GIVE);
        return (group?.items ?? [])
            .filter(item => item.isActive && item.direction === 'OUT')
            .map(item => ({
                id: item.id,
                name: item.name,
                counterparty: item.counterparty,
                monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
            }));
    }, [fixedQuery.data]);
    const monthlyPlanned = giveFixed.reduce((total, item) => total + item.monthly, 0);

    const txQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: {
                householdId: householdId!,
                jarId: giveJar?.id ?? undefined,
                status: TransactionStatus.SORTED,
                limit: 100,
            },
        }),
        EMPTY_TRANSACTION_PAGE,
        live && Boolean(giveJar)
    );
    const recipients = useMemo(() => {
        const since = yearStartIso();
        const totals = new Map<string, number>();
        for (const tx of txQuery.data?.items ?? []) {
            if (tx.amount >= 0 || tx.bookedOn < since) continue;
            const who = tx.counterparty?.trim() || tx.description;
            totals.set(who, (totals.get(who) ?? 0) + Math.abs(tx.amount));
        }
        return [...totals.entries()]
            .map(([name, total]) => ({ name, total }))
            .sort((left, right) => right.total - left.total);
    }, [txQuery.data]);
    const givenThisYear = recipients.reduce((total, row) => total + row.total, 0);

    const pledgeProgress =
        pledge && pledge.target > 0 ? Math.min(1, pledge.saved / pledge.target) : 0;
    const monthsLeft = pledge?.targetOn
        ? Math.max(
              1,
              (new Date(pledge.targetOn).getUTCFullYear() - new Date().getUTCFullYear()) * 12 +
                  (new Date(pledge.targetOn).getUTCMonth() - new Date().getUTCMonth())
          )
        : null;
    const neededPerMonth =
        pledge && monthsLeft
            ? Math.max(0, Math.ceil((pledge.target - pledge.saved) / monthsLeft))
            : null;

    return (
        <div className="grid animate-rise gap-6">
            <Section eyebrow="Giving" title={WHY_GIVE.headline}>
                <p className="max-w-prose text-base text-pretty text-fg-muted">
                    {WHY_GIVE.body[0]}
                </p>
            </Section>

            <div className="grid items-start gap-4 lg:grid-cols-2">
                {/* This year */}
                <Card className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Eyebrow className="text-accent">✦ This year</Eyebrow>
                        {giveJar ? (
                            <span className="font-mono text-xs text-fg-faint">
                                Give jar · {giveJar.percentage}%
                            </span>
                        ) : null}
                    </div>

                    {pledge ? (
                        <>
                            <div>
                                <p className="text-sm text-fg-muted">{pledge.name}</p>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="font-display text-3xl font-semibold tracking-tight text-accent">
                                        {formatMoney(pledge.saved)}
                                    </span>
                                    <span className="font-mono text-xs text-fg-muted">
                                        of {formatMoney(pledge.target)} pledged
                                    </span>
                                </div>
                            </div>
                            <Meter value={pledgeProgress} />
                            <p className="text-sm leading-relaxed text-fg-secondary">
                                {pledge.status === GoalStatus.REACHED
                                    ? 'Pledge met. The jar keeps flowing — that was the point.'
                                    : neededPerMonth !== null && monthsLeft !== null
                                      ? monthlyPlanned >= neededPerMonth
                                          ? `${formatMoney(monthlyPlanned)} leaves every month — enough to land the pledge with ${monthsLeft} ${monthsLeft === 1 ? 'month' : 'months'} to go.`
                                          : `${formatMoney(neededPerMonth)} a month would land it; ${formatMoney(monthlyPlanned)} is planned. The gap is a choice, not a failure.`
                                      : 'No date on this pledge yet.'}
                            </p>
                            <button
                                type="button"
                                onClick={() => router.push(updateHref('goal', pledge.id))}
                                className="w-full rounded-full border border-line-strong py-2.5 font-mono text-xs tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent">
                                Edit pledge
                            </button>
                        </>
                    ) : (
                        <>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-display text-3xl font-semibold tracking-tight text-accent">
                                        {formatMoney(givenThisYear)}
                                    </span>
                                    <span className="font-mono text-xs text-fg-muted">
                                        given so far
                                    </span>
                                </div>
                            </div>
                            <p className="text-sm leading-relaxed text-fg-secondary">
                                A pledge gives the jar a finish line for the year. Every sorted
                                amount that leaves Give counts toward it — nothing to move by hand.
                            </p>
                            <Button
                                size="sm"
                                onClick={() =>
                                    router.push(createGoalHref({ kind: GoalKind.GIVE }))
                                }>
                                Set a pledge for this year
                            </Button>
                        </>
                    )}
                </Card>

                {/* Where it goes */}
                <Card className="grid gap-4 p-0">
                    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                        <Eyebrow className="text-accent">✦ Where it goes</Eyebrow>
                        <span className="font-mono text-xs text-fg-secondary">
                            {formatMoney(monthlyPlanned)}/mo planned
                        </span>
                    </div>

                    <div className="grid gap-px">
                        {giveFixed.length === 0 ? (
                            <p className="px-5 pb-1 text-sm text-fg-muted">
                                Nothing leaves the Give jar automatically yet.
                            </p>
                        ) : (
                            giveFixed.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => router.push(updateHref('fixed', item.id))}
                                    className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left hover:bg-raised">
                                    <span className="min-w-0">
                                        <span className="block truncate text-sm text-fg">
                                            {item.counterparty ?? item.name}
                                        </span>
                                        {item.counterparty ? (
                                            <span className="block font-mono text-xs text-fg-faint">
                                                {item.name}
                                            </span>
                                        ) : (
                                            <span className="block font-mono text-xs text-warning">
                                                No organisation named yet
                                            </span>
                                        )}
                                    </span>
                                    <span className="font-mono text-sm whitespace-nowrap text-fg">
                                        {formatMoney(item.monthly)}/mo
                                    </span>
                                </button>
                            ))
                        )}
                    </div>

                    <div className="border-t border-line px-5 py-4">
                        <p className="mb-2 font-mono text-xs tracking-widest text-fg-muted uppercase">
                            Received this year
                        </p>
                        {recipients.length === 0 ? (
                            <p className="text-sm text-fg-muted">
                                No sorted giving in the ledger yet this year.
                            </p>
                        ) : (
                            <ul className="grid gap-1.5">
                                {recipients.slice(0, 6).map(row => (
                                    <li
                                        key={row.name}
                                        className="flex items-center justify-between gap-3 text-sm">
                                        <span className="min-w-0 truncate text-fg-secondary">
                                            {row.name}
                                        </span>
                                        <span className="font-mono text-xs whitespace-nowrap text-fg">
                                            {formatMoney(row.total)}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                    router.push(createFixedHref({ jarId: giveJar?.id }))
                                }>
                                + Add a recurring gift
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => router.push(productPath('money/jars/give'))}>
                                Open the Give jar
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Choose well */}
            <GivingFinder
                defaultOpen
                onPick={organisation =>
                    router.push(
                        createFixedHref({
                            jarId: giveJar?.id,
                            counterparty: organisation.name,
                        })
                    )
                }
            />

            {/* The four checks */}
            <section className="grid gap-3">
                <Eyebrow className="text-accent">✦ Four checks for any organisation</Eyebrow>
                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                    {WHY_GIVE.checks.map((check, index) => (
                        <div
                            key={check.title}
                            className="grid gap-2 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md"
                            style={{ borderTopColor: 'var(--color-jar-give)' }}>
                            <span className="font-mono text-xs font-medium tracking-widest text-fg-faint uppercase">
                                0{index + 1}
                            </span>
                            <span className="font-display text-lg font-semibold text-fg">
                                {check.title}
                            </span>
                            <span className="text-sm leading-relaxed text-fg-muted">
                                {check.body}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            <CoachTipCard title="Why this is in a money app">
                {WHY_GIVE.body[1]} {WHY_GIVE.body[2]}
            </CoachTipCard>
        </div>
    );
}
