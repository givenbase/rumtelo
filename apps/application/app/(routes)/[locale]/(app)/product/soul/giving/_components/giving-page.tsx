'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { FixedCost, Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus, JarKey, TransactionStatus } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, EmptyState, Meter, Section, Typography } from '@rumtelo/ui';
import {
    describePeriodTravel,
    endOfPeriodIso,
    isFixedCostCounting,
    monthlyAmount,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';

import {
    createFixedHref,
    createGoalHref,
    fixedDetailHref,
    goalDetailHref,
} from '@/app/_lib/create-routes';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
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
import { useAppShell } from '@/components/features/shell/app-shell-context';
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

function pledgeMonth(iso: string | null, locale: string): string | null {
    if (!iso) return null;
    const year = Number(iso.slice(0, 4));
    const month = Number(iso.slice(5, 7));
    if (!year || !month) return null;
    return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
        new Date(Date.UTC(year, month - 1, 1))
    );
}

/**
 * Soul → Giving. Money owns the flow (jar, fixed cost, ledger); this page owns the
 * meaning: why the Give jar exists, where it goes, and how to choose a place well.
 */
const GIVING_CHECKS = ['1', '2', '3', '4'] as const;

export function GivingPageClient() {
    const t = useTranslations('features.soul.giving');
    const tChips = useTranslations('features.money.chips');
    const locale = useLocale();
    const { householdId } = useAuth();
    const { period } = useAppShell();
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
    const travel = describePeriodTravel(period);
    const traveling = travel.direction !== 'current';
    const periodKey = toPeriodKey(period.year, period.month);
    const pledgeAt = useMemo(() => {
        if (!traveling || !pledge) return null;
        return (
            projectGoalsAtHorizon({
                monthsDelta: travel.monthsDelta,
                direction: travel.direction,
                selectedPeriodEndIso: endOfPeriodIso(periodKey),
                goals: [
                    {
                        id: pledge.id,
                        name: pledge.name,
                        jarKey: JarKey.GIVE,
                        kind: pledge.kind,
                        status: pledge.status,
                        saved: pledge.saved,
                        target: pledge.target,
                        monthlyContribution: pledge.monthlyContribution,
                        targetOn: pledge.targetOn,
                        fulfilledOn: pledge.fulfilledOn,
                    },
                ],
            })[0] ?? null
        );
    }, [traveling, pledge, travel.monthsDelta, travel.direction, periodKey]);

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

    const shownSaved = pledgeAt?.projectedSaved ?? pledge?.saved ?? 0;
    const pledgeProgress =
        pledge && pledge.target > 0 ? Math.min(1, shownSaved / pledge.target) : 0;
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
            <Section eyebrow={t('eyebrow')} title={t('headline')}>
                <Typography as="p" variant="lead" size="default">
                    {t('lead')}
                </Typography>
            </Section>

            <ListToolbar
                createLabel={t('add_recurring')}
                createHref={createFixedHref({ jarId: giveJar?.id, payeeMode: 'known' })}
                secondary={
                    <Button
                        as={Link}
                        href={productPath('money/jars/give')}
                        size="sm"
                        variant="ghost">
                        {t('open_jar')}
                    </Button>
                }
            />

            <div className="grid items-start gap-4 lg:grid-cols-2">
                {/* This year */}
                <Card className="grid gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {t('this_year')}
                        </Typography>
                        {giveJar ? (
                            <span className="font-mono text-xs text-fg-faint">
                                {t('jar_pct', { pct: giveJar.percentage })}
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
                                    {pledgeAt && pledgeAt.projectedSaved !== pledge.saved ? (
                                        <span className="font-display text-3xl font-semibold tracking-tight">
                                            <span className="text-fg-faint">
                                                {formatMoney(pledge.saved)}
                                            </span>
                                            <span className="mx-1 text-fg-faint">→</span>
                                            <span className="text-success">
                                                {formatMoney(pledgeAt.projectedSaved)}
                                            </span>
                                        </span>
                                    ) : (
                                        <span className="font-display text-3xl font-semibold tracking-tight text-accent">
                                            {formatMoney(pledge.saved)}
                                        </span>
                                    )}
                                    <Typography as="span" variant="caption" className="font-mono">
                                        {t('pledged_of', { amount: formatMoney(pledge.target) })}
                                    </Typography>
                                </div>
                            </div>
                            <Meter value={pledgeProgress} />
                            <Typography as="p" size="sm" color="secondary">
                                {pledgeAt?.fulfilledByPeriod
                                    ? t('reached_by', {
                                          when:
                                              pledgeMonth(pledgeAt.reachedOn, locale) ??
                                              t('reached_by_fallback'),
                                      })
                                    : pledge.status === GoalStatus.REACHED
                                      ? t('pledge_met')
                                      : neededPerMonth !== null && monthsLeft !== null
                                        ? monthlyPlanned >= neededPerMonth
                                            ? t(
                                                  monthsLeft === 1
                                                      ? 'pledge_on_track'
                                                      : 'pledge_on_track_plural',
                                                  {
                                                      planned: formatMoney(monthlyPlanned),
                                                      months: monthsLeft,
                                                  }
                                              )
                                            : t('pledge_gap', {
                                                  needed: formatMoney(neededPerMonth),
                                                  planned: formatMoney(monthlyPlanned),
                                              })
                                        : t('pledge_no_date')}
                            </Typography>
                            <Link
                                href={goalDetailHref(pledge.id)}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line-strong py-2.5 font-mono text-xs tracking-wide text-fg-muted uppercase transition-colors hover:border-accent-hover hover:text-accent">
                                {t('open_pledge')}
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
                                        {t('given_so_far')}
                                    </Typography>
                                </div>
                            </div>
                            <Typography as="p" size="sm" color="secondary">
                                {t('pledge_pitch')}
                            </Typography>
                            <Button
                                as={Link}
                                href={createGoalHref({ kind: GoalKind.GIVE })}
                                size="sm">
                                {t('set_pledge')}
                            </Button>
                        </>
                    )}
                </Card>

                {/* Where it goes */}
                <Card className="grid gap-4 p-0">
                    <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                        <Typography as="span" variant="eyebrow" color="primary">
                            ✦ {t('where_goes')}
                        </Typography>
                        <span className="font-mono text-xs text-fg-secondary">
                            {t('planned_mo', { amount: formatMoney(monthlyPlanned) })}
                        </span>
                    </div>

                    <div className="grid gap-px">
                        {giveFixed.length === 0 ? (
                            <EmptyState
                                variant="compact"
                                className="border-0 bg-transparent"
                                title={t('empty_auto_title')}
                                body={t('empty_auto_body')}
                            />
                        ) : (
                            giveFixed.map(item => {
                                const company = item.counterparty?.trim() || item.name;
                                const due = formatDueDay(item.dueDay, tChips);
                                return (
                                    <MoneyPartyRow
                                        key={item.id}
                                        title={company}
                                        subtitle={item.counterparty ? item.name : t('no_org')}
                                        mark={partyMark(
                                            findPartyVendor(company, merchants, givingOrgs),
                                            catalogMarkChrome({
                                                billName: item.name,
                                                jarKey: JarKey.GIVE,
                                                jarByKey,
                                                categoryTemplates,
                                            })
                                        )}
                                        amount={tChips('amount_per_month', {
                                            amount: formatMoney(item.monthly),
                                        })}
                                        badges={
                                            <>
                                                {due ? <MetaChip>{due}</MetaChip> : null}
                                                <MetaChip>
                                                    {cadenceLabel(item.cadence, tChips)}
                                                </MetaChip>
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
                            {t('received_year')}
                        </Typography>
                        {recipients.length === 0 ? (
                            <EmptyState
                                variant="compact"
                                className="border-0 bg-transparent"
                                title={t('empty_ledger_title')}
                                body={t('empty_ledger_body')}
                            />
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
                            {t('to_whom')}
                        </Typography>
                    </div>
                    <Typography as="p" size="sm" color="secondary">
                        {t('pick_who')}
                    </Typography>
                    <div className="flex flex-wrap gap-2" role="group" aria-label={t('pick_aria')}>
                        {(
                            [
                                { id: 'known' as const, label: t('pick_known') },
                                { id: 'coach' as const, label: t('pick_coach') },
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
                        {t('pick_hint')}
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
                    aria-label={t('checks_aria')}>
                    <div className="flex flex-wrap items-center gap-2">
                        <CoachMark size="sm" />
                        <Typography as="span" variant="eyebrow" color="primary">
                            {t('checks_heading')}
                        </Typography>
                    </div>
                    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                        {GIVING_CHECKS.map((key, index) => (
                            <div
                                key={key}
                                className="grid gap-2 rounded-2xl border border-t-4 border-line bg-surface p-5 shadow-md ring-1 ring-accent/10"
                                style={{ borderTopColor: 'var(--color-jar-give)' }}>
                                <Typography
                                    as="span"
                                    variant="eyebrow"
                                    color="muted"
                                    className="text-fg-faint">
                                    0{index + 1}
                                </Typography>
                                <Typography as="h3">{t(`check_${key}_title`)}</Typography>
                                <Typography as="p" size="sm" color="muted">
                                    {t(`check_${key}_body`)}
                                </Typography>
                            </div>
                        ))}
                    </div>
                </section>
            </HelperGate>

            <CoachTipCard title={t('coach_tip_title')}>
                {t('coach_tip_1')} {t('coach_tip_2')}
            </CoachTipCard>
        </div>
    );
}
