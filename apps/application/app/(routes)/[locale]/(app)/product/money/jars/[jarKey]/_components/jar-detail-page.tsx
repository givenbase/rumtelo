'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';

import { GoalKind, GoalStatus, JarKey, jarCapabilitiesFor } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, EmptyState, Typography } from '@rumtelo/ui';
import {
    describePeriodTravel,
    endOfPeriodIso,
    isFixedCostCounting,
    moneyDelta,
    projectGoalsAtHorizon,
    toPeriodKey,
} from '@rumtelo/utils';

import { claimLinkedFixedCostTxIds } from '@/app/_lib/fixed-cost-match';
import { activeSaveGoalsOnJar, focusSaveGoal } from '@/app/_lib/goal-focus';
import { resolveJarSubtitle } from '@/app/_lib/jar-copy';
import { jarChrome } from '@/app/_lib/jar-meta';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { JarGuideCard } from '@/components/features/helpers';
import { JarCategoryBreakdown } from '@/components/features/money/jar-category-breakdown';
import { JarCoverageStrip } from '@/components/features/money/jar-coverage-strip';
import { JarGoalAccordion } from '@/components/features/money/jar-goal-accordion';
import { MetaChip, formatBookedDate } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { MoneyDeltaLabel } from '@/components/features/home/money-delta-label';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import {
    createGoalHref,
    createMoveHref,
    createTxHref,
    goalDetailHref,
    txDetailHref,
} from '@/app/_lib/create-routes';

/**
 * Per-jar detail — coverage, collapsible categories (fixed costs + activity),
 * goals, period transactions, guide, and CTAs.
 */
export function JarDetailPageClient({ jarKey }: { jarKey: JarKey }) {
    const t = useTranslations('features.money.jars.detail');
    const tJars = useTranslations('features.money.jars');
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);
    const { byKey: catalogByKey } = useJarCatalog();
    const catalog = catalogByKey.get(jarKey);

    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        null,
        live
    );

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
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
    const categoryTemplatesQuery = useCategoryTemplates(live);
    const merchants = merchantsQuery.data ?? [];
    const givingOrgs = givingOrgsQuery.data ?? [];
    const categoryTemplates = categoryTemplatesQuery.data ?? [];

    const jar = (dashboardQuery.data?.jars ?? []).find(row => row.key === jarKey);
    const stacked = dashboardQuery.data?.travel?.mode === 'stacked';
    const baselineAllocated =
        dashboardQuery.data?.baselineJars?.find(row => row.id === jar?.id)?.allocated ?? null;

    const txQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: {
                householdId: householdId!,
                period: periodKey,
                jarId: jar?.id,
                limit: 50,
            },
        }),
        { items: [], nextCursor: null },
        live && Boolean(jar?.id)
    );

    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const fixedGroup = (byJarQuery.data ?? []).find(group => group.jarKey === jarKey);
    const fixedOut = (fixedGroup?.items ?? []).filter(
        item => item.direction === 'OUT' && isFixedCostCounting(item)
    );

    const transactions = [...(txQuery.data?.items ?? [])].sort((left, right) =>
        right.bookedOn.localeCompare(left.bookedOn)
    );
    const settlements = settlementsQuery.data ?? [];
    const claimedTxIds = claimLinkedFixedCostTxIds(transactions, settlements);
    const leftoverPeriodTxs = transactions.filter(tx => !claimedTxIds.has(tx.id));

    if (!jar) {
        return (
            <div className="grid animate-rise gap-6">
                <Link
                    href="/product/money/jars"
                    className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    {t('back_jars')}
                </Link>
                <Typography as="p" size="sm" color="muted">
                    {t('loading_jar')}
                </Typography>
            </div>
        );
    }

    const colorClass = jarChrome(jarKey).color;
    const allocationDelta =
        stacked && baselineAllocated !== null && baselineAllocated !== jar.allocated
            ? moneyDelta(baselineAllocated, jar.allocated)
            : null;
    const caps = jarCapabilitiesFor(jar.key);
    const allowsFixedCosts = caps.allowsFixedCosts;
    const showGoals =
        caps.canSave || caps.canInvest || jar.key === JarKey.PLAY || jar.key === JarKey.GIVE;
    const jarGoals = (goalsQuery.data ?? []).filter(goal => {
        if (goal.jarId !== jar.id) return false;
        if (goal.status === GoalStatus.ARCHIVED) return false;
        if (goal.kind === GoalKind.SAVE) return true;
        return jar.key === JarKey.GIVE && goal.kind === GoalKind.GIVE;
    });
    const travel = describePeriodTravel(period);
    const projectionById = new Map(
        travel.direction === 'current'
            ? []
            : projectGoalsAtHorizon({
                  monthsDelta: travel.monthsDelta,
                  direction: travel.direction,
                  selectedPeriodEndIso: endOfPeriodIso(periodKey),
                  goals: jarGoals.map(goal => ({
                      id: goal.id,
                      name: goal.name,
                      jarKey,
                      kind: goal.kind,
                      status: goal.status,
                      saved: goal.saved,
                      target: goal.target,
                      monthlyContribution: goal.monthlyContribution,
                      targetOn: goal.targetOn,
                      fulfilledOn: goal.fulfilledOn,
                  })),
              }).map(row => [row.goalId, row] as const)
    );
    const goalsForList =
        travel.direction === 'current'
            ? jarGoals
            : jarGoals.map(goal => {
                  const projected = projectionById.get(goal.id);
                  if (!projected) return goal;
                  return {
                      ...goal,
                      saved: projected.projectedSaved,
                      status: projected.fulfilledByPeriod ? GoalStatus.REACHED : goal.status,
                  };
              });
    const focusGoal = focusSaveGoal(goalsQuery.data ?? [], jar.id);
    const saveQueue = activeSaveGoalsOnJar(goalsQuery.data ?? [], jar.id);
    const addGoalHref = createGoalHref({
        jarId: jar.id,
        kind: jar.key === JarKey.GIVE ? GoalKind.GIVE : GoalKind.SAVE,
    });

    return (
        <div className="grid animate-rise gap-8">
            <div className="grid gap-4">
                <Link
                    href="/product/money/jars"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase transition-colors hover:text-accent">
                    {t('back_jars')}
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-raised text-xl">
                            {jar.icon ?? catalog?.icon ?? '◇'}
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <Typography as="h1">{jar.name}</Typography>
                            <p className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                {resolveJarSubtitle(tJars, jarKey, jar.subtitle, catalog?.subtitle)}{' '}
                                · {t('pct_of_net', { pct: jar.percentage })}
                            </p>
                            {allocationDelta ? (
                                <MoneyDeltaLabel
                                    className="font-mono text-sm"
                                    fromLabel={formatMoney(allocationDelta.from)}
                                    toLabel={formatMoney(allocationDelta.to)}
                                    deltaLabel={`${allocationDelta.delta > 0 ? '+' : ''}${formatMoney(allocationDelta.delta)}`}
                                />
                            ) : null}
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {caps.canSpend ? (
                            <>
                                <Button
                                    as={Link}
                                    href={createMoveHref({
                                        fromJarId: jar.id,
                                        returnTo: `/product/money/jars/${jarKeyToSlug(jar.key)}`,
                                    })}
                                    size="sm"
                                    variant="secondary">
                                    {tJars('move_between')}
                                </Button>
                                <Button as={Link} href={createTxHref({ jarId: jar.id })} size="sm">
                                    {tJars('add_transaction')}
                                </Button>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>

            {/* Coverage strip */}
            <JarCoverageStrip
                allocated={jar.allocated}
                spent={jar.spent}
                credited={jar.credited}
                committedOut={jar.committedOut}
                colorClass={colorClass}
                showCommitted={allowsFixedCosts}
                footnote={
                    stacked
                        ? t('stacked_footnote', {
                              months: dashboardQuery.data?.travel?.monthsHorizon ?? '—',
                          })
                        : undefined
                }
            />

            {/* Categories — expand for fixed costs + period activity */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {t('categories_month')}
                    </Typography>
                    {allowsFixedCosts ? (
                        <Link
                            href="/product/money/fixed-costs"
                            className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                            {t('all_fixed_costs')}
                        </Link>
                    ) : null}
                </div>
                <Card className="p-0">
                    <div className="hidden items-center gap-3 border-b border-line px-5 py-2 font-mono text-xs font-medium tracking-wide text-fg-faint uppercase sm:flex">
                        <span className="w-9 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">{t('category')}</span>
                        <span className="flex min-w-0 flex-1 items-center justify-end gap-6">
                            <span className="w-20 text-right">{t('planned')}</span>
                            <span className="w-20 text-right">{t('spent')}</span>
                            <span className="w-24 text-right">{t('over_under')}</span>
                        </span>
                        <span className="w-3 shrink-0" aria-hidden />
                    </div>
                    <JarCategoryBreakdown
                        categories={[...(jar.categories ?? [])].filter(
                            category => !category.isArchived
                        )}
                        fixedCosts={fixedOut}
                        transactions={transactions}
                        settlements={settlements}
                        period={period}
                        jarKey={jarKey}
                        jarIcon={jar.icon ?? catalog?.icon}
                        jarByKey={catalogByKey}
                        categoryTemplates={categoryTemplates}
                        merchants={merchants}
                        givingOrgs={givingOrgs}
                        allowFixedCosts={allowsFixedCosts}
                    />
                </Card>
            </section>

            {showGoals ? (
                <section className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Typography as="h2" variant="eyebrow" color="primary">
                            {t('goals_on_jar')}
                        </Typography>
                        <Link
                            href={addGoalHref}
                            className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                            {t('add_goal')}
                        </Link>
                    </div>
                    {focusGoal ? (
                        <Card className="grid gap-2 border-accent/30 bg-accent-soft/50 p-4">
                            <p className="font-mono text-[10px] tracking-wider text-accent uppercase">
                                {t('focus_of', { total: saveQueue.length })}
                            </p>
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <Link
                                    href={goalDetailHref(focusGoal.id)}
                                    className="min-w-0 text-sm font-semibold text-fg hover:text-accent">
                                    {focusGoal.icon ? `${focusGoal.icon} ` : ''}
                                    {focusGoal.name}
                                </Link>
                                <span className="font-mono text-sm text-fg-muted">
                                    {formatMoney(
                                        projectionById.get(focusGoal.id)?.projectedSaved ??
                                            Math.min(focusGoal.target, Math.max(0, jar.available))
                                    )}{' '}
                                    / {formatMoney(focusGoal.target)}
                                </span>
                            </div>
                            <p className="text-xs text-fg-muted">{t('fill_jar_first')}</p>
                        </Card>
                    ) : null}
                    <Card className="p-0">
                        <JarGoalAccordion
                            goals={goalsForList}
                            jarAvailableCents={stacked ? null : jar.available}
                        />
                    </Card>
                </section>
            ) : null}

            {/* Unmatched / one-off activity (bills settled under categories stay there) */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {t('other_activity')}
                    </Typography>
                    <Link
                        href="/product/money/transactions"
                        className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        {t('all_transactions')}
                    </Link>
                </div>
                <Card className="p-0">
                    {leftoverPeriodTxs.length === 0 ? (
                        <EmptyState
                            variant="compact"
                            className="border-0 bg-transparent"
                            title={
                                transactions.length === 0
                                    ? t('no_tx_month_title')
                                    : t('all_nested_title')
                            }
                            body={
                                transactions.length === 0
                                    ? t('no_tx_month_body')
                                    : t('all_nested_body')
                            }
                        />
                    ) : (
                        <ul className="grid">
                            {leftoverPeriodTxs.map(tx => {
                                const title = tx.counterparty?.trim() || tx.description;
                                const subtitle =
                                    tx.counterparty?.trim() &&
                                    tx.description &&
                                    tx.description !== tx.counterparty.trim()
                                        ? tx.description
                                        : null;
                                return (
                                    <li key={tx.id}>
                                        <MoneyPartyRow
                                            title={title}
                                            subtitle={subtitle}
                                            mark={partyMark(
                                                findPartyVendor(title, merchants, givingOrgs),
                                                catalogMarkChrome({
                                                    jarKey,
                                                    jarByKey: catalogByKey,
                                                    categoryTemplates,
                                                })
                                            )}
                                            amount={formatMoney(tx.amount)}
                                            amountClassName={
                                                tx.amount < 0 ? 'text-fg' : 'text-success'
                                            }
                                            badges={
                                                <MetaChip>
                                                    {formatBookedDate(tx.bookedOn, appLocale)}
                                                </MetaChip>
                                            }
                                            href={txDetailHref(tx.id)}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </section>

            <JarGuideCard jarKey={jarKey} jarId={jar.id} allocatedCents={jar.allocated} />
        </div>
    );
}
