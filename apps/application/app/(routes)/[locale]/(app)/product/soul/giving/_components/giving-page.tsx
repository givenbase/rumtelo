'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { FixedCost, Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus, JarKey, TransactionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, Meter, Section, Typography } from '@rumtelo/ui';
import { monthlyAmount, isFixedCostCounting } from '@rumtelo/utils';

import {
    createFixedHref,
    createGoalHref,
    fixedDetailHref,
    goalDetailHref,
} from '@/app/_lib/create-routes';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import { WHY_GIVE } from '@/app/_lib/giving';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { productPath } from '@/app/_lib/routes';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { CoachMark, CoachTipCard, HelperGate } from '@/components/features/helpers';
import { GivingFinder } from '@/components/features/money/giving-finder';
import { MetaChip, formatDueDay } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const EMPTY_TRANSACTION_PAGE = { items: [] as never[], nextCursor: null };

type GivePickMode = 'known' | 'coach' | 'manual' | null;

type GivePledge = Pick<
    Goal,
    | 'id'
    | 'kind'
    | 'status'
    | 'name'
    | 'target'
    | 'saved'
    | 'monthlyContribution'
    | 'targetOn'
    | 'fulfilledOn'
>;

type GiveFixedRow = Pick<FixedCost, 'id' | 'name' | 'counterparty' | 'cadence' | 'dueDay'> & {
    monthly: number;
};

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
    const [givePickMode, setGivePickMode] = useState<GivePickMode>(null);

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
    const pledge = useMemo((): GivePledge | null => {
        const rows = (goalsQuery.data ?? []) as ReadonlyArray<GivePledge>;
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
    const giveFixed = useMemo((): GiveFixedRow[] => {
        const group = (fixedQuery.data ?? []).find(row => row.jarKey === JarKey.GIVE);
        return (group?.items ?? [])
            .filter(item => isFixedCostCounting(item) && item.direction === 'OUT')
            .map(item => ({
                id: item.id,
                name: item.name,
                counterparty: item.counterparty,
                cadence: item.cadence,
                dueDay: item.dueDay,
                monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
            }));
    }, [fixedQuery.data]);
    const monthlyPlanned = giveFixed.reduce((total, item) => total + item.monthly, 0);
    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );
    const givingOrgsQuery = useLiveQuery(
        apiQuery.money.catalogs.givingOrganisations.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [] as never,
        live
    );
    const merchants = merchantsQuery.data ?? [];
    const givingOrgs = givingOrgsQuery.data ?? [];
    const categoryTemplatesQuery = useCategoryTemplates(live);
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const { byKey: jarByKey } = useJarCatalog();

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
                <Typography as="p" variant="lead" size="default">
                    {WHY_GIVE.body[0]}
                </Typography>
            </Section>

            <ListToolbar
                createLabel="+ Add a recurring gift"
                createHref={createFixedHref({ jarId: giveJar?.id, payeeMode: 'known' })}
                secondary={
                    <Button
                        as={Link}
                        href={productPath('money/jars/give')}
                        size="sm"
                        variant="ghost">
                        Open the Give jar
                    </Button>
                }
            />

            <div className="grid items-start gap-4 lg:grid-cols-2">
                {/* This year */}
                <Card className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ This year
                        </Typography>
                        {giveJar ? (
                            <span className="font-mono text-xs text-fg-faint">
                                Give jar · {giveJar.percentage}%
                            </span>
                        ) : null}
                    </div>

                    {pledge ? (
                        <>
                            <div>
                                <Typography as="p" size="sm" color="muted">
                                    {pledge.name}
                                </Typography>
                                <div className="mt-1 flex items-baseline gap-2">
                                    <span className="font-display text-3xl font-semibold tracking-tight text-accent">
                                        {formatMoney(pledge.saved)}
                                    </span>
                                    <Typography as="span" variant="caption" className="font-mono">
                                        of {formatMoney(pledge.target)} pledged
                                    </Typography>
                                </div>
                            </div>
                            <Meter value={pledgeProgress} />
                            <Typography as="p" size="sm" color="secondary">
                                {pledge.status === GoalStatus.REACHED
                                    ? 'Pledge met. The jar keeps flowing — that was the point.'
                                    : neededPerMonth !== null && monthsLeft !== null
                                      ? monthlyPlanned >= neededPerMonth
                                          ? `${formatMoney(monthlyPlanned)} leaves every month — enough to land the pledge with ${monthsLeft} ${monthsLeft === 1 ? 'month' : 'months'} to go.`
                                          : `${formatMoney(neededPerMonth)} a month would land it; ${formatMoney(monthlyPlanned)} is planned. The gap is a choice, not a failure.`
                                      : 'No date on this pledge yet.'}
                            </Typography>
                            <Link
                                href={goalDetailHref(pledge.id)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line-strong py-2.5 font-mono text-xs tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent">
                                Open pledge ›
                            </Link>
                        </>
                    ) : (
                        <>
                            <div>
                                <div className="flex items-baseline gap-2">
                                    <span className="font-display text-3xl font-semibold tracking-tight text-accent">
                                        {formatMoney(givenThisYear)}
                                    </span>
                                    <Typography as="span" variant="caption" className="font-mono">
                                        given so far
                                    </Typography>
                                </div>
                            </div>
                            <Typography as="p" size="sm" color="secondary">
                                A pledge gives the jar a finish line for the year. Every sorted
                                amount that leaves Give counts toward it — nothing to move by hand.
                            </Typography>
                            <Button
                                as={Link}
                                href={createGoalHref({ kind: GoalKind.GIVE })}
                                size="sm">
                                Set a pledge for this year
                            </Button>
                        </>
                    )}
                </Card>

                {/* Where it goes */}
                <Card className="grid gap-4 p-0">
                    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ Where it goes
                        </Typography>
                        <span className="font-mono text-xs text-fg-secondary">
                            {formatMoney(monthlyPlanned)}/mo planned
                        </span>
                    </div>

                    <div className="grid gap-px">
                        {giveFixed.length === 0 ? (
                            <Typography as="p" size="sm" color="muted" className="px-5 pb-1">
                                Nothing leaves the Give jar automatically yet.
                            </Typography>
                        ) : (
                            giveFixed.map(item => {
                                const company = item.counterparty?.trim() || item.name;
                                const due = formatDueDay(item.dueDay);
                                return (
                                    <MoneyPartyRow
                                        key={item.id}
                                        title={company}
                                        subtitle={
                                            item.counterparty
                                                ? item.name
                                                : 'No organisation named yet'
                                        }
                                        mark={partyMark(
                                            findPartyVendor(company, merchants, givingOrgs),
                                            catalogMarkChrome({
                                                billName: item.name,
                                                jarKey: JarKey.GIVE,
                                                jarByKey,
                                                categoryTemplates,
                                            })
                                        )}
                                        amount={`${formatMoney(item.monthly)}/mo`}
                                        badges={
                                            <>
                                                {due ? <MetaChip>{due}</MetaChip> : null}
                                                <MetaChip>{cadenceLabel(item.cadence)}</MetaChip>
                                            </>
                                        }
                                        href={fixedDetailHref(item.id)}
                                    />
                                );
                            })
                        )}
                    </div>

                    <div className="border-t border-line px-5 py-4">
                        <Typography as="p" variant="eyebrow" color="muted" className="mb-2">
                            Received this year
                        </Typography>
                        {recipients.length === 0 ? (
                            <Typography as="p" size="sm" color="muted">
                                No sorted giving in the ledger yet this year.
                            </Typography>
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
                    </div>
                </Card>
            </div>

            {/* Choose well — same three paths as the fixed-cost Give form */}
            <Card className="grid gap-4">
                <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <Typography as="span" variant="eyebrow" color="primary">
                            To whom
                        </Typography>
                    </div>
                    <Typography as="p" size="sm" color="secondary">
                        How do you want to pick who receives this gift?
                    </Typography>
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label="How do you want to pick?">
                        {(
                            [
                                { id: 'known' as const, label: 'I know who' },
                                { id: 'coach' as const, label: 'Help me choose' },
                            ] as const
                        ).map(option => {
                            const on = givePickMode === option.id;
                            if (option.id === 'coach') {
                                return (
                                    <button
                                        key={option.id}
                                        type="button"
                                        aria-pressed={on}
                                        onClick={() => setGivePickMode('coach')}
                                        className={
                                            on
                                                ? 'rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                                : 'rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                        }>
                                        {option.label}
                                    </button>
                                );
                            }
                            return (
                                <Link
                                    key={option.id}
                                    href={createFixedHref({
                                        jarId: giveJar?.id,
                                        payeeMode: option.id,
                                    })}
                                    aria-pressed={on}
                                    onClick={() => setGivePickMode(option.id)}
                                    className={
                                        on
                                            ? 'rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                            : 'rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                    }>
                                    {option.label}
                                </Link>
                            );
                        })}
                    </div>
                    <Typography as="p" variant="caption" className="text-fg-faint">
                        I know who — type whoever you already give to. Help me choose — Coach
                        shortlist with independent checks (Doneer Effectief, GiveWell, ACE, CBF).
                    </Typography>
                </div>

                {givePickMode === 'coach' ? (
                    <GivingFinder
                        defaultOpen
                        onPick={organisation =>
                            router.push(
                                createFixedHref({
                                    jarId: giveJar?.id,
                                    orgKey: organisation.key,
                                    payeeMode: 'coach',
                                })
                            )
                        }
                    />
                ) : null}
            </Card>

            {/* The four checks — Coach guide, not permanent page chrome */}
            <HelperGate>
                <section
                    className="grid gap-3"
                    data-feature-helper="giving-checks"
                    data-coach-guide="giving-checks"
                    aria-label="The Coach: four checks for any organisation">
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <Typography as="span" variant="eyebrow" color="primary">
                            Four checks for any organisation
                        </Typography>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        {WHY_GIVE.checks.map((check, index) => (
                            <div
                                key={check.title}
                                className="grid gap-2 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md ring-1 ring-accent/10"
                                style={{ borderTopColor: 'var(--color-jar-give)' }}>
                                <Typography
                                    as="span"
                                    variant="eyebrow"
                                    color="muted"
                                    className="text-fg-faint">
                                    0{index + 1}
                                </Typography>
                                <Typography as="h3">{check.title}</Typography>
                                <Typography as="p" size="sm" color="muted">
                                    {check.body}
                                </Typography>
                            </div>
                        ))}
                    </div>
                </section>
            </HelperGate>

            <CoachTipCard title="Why this is in a money app">
                {WHY_GIVE.body[1]} {WHY_GIVE.body[2]}
            </CoachTipCard>
        </div>
    );
}
