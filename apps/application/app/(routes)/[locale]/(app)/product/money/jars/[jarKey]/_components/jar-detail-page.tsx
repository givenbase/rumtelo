'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { GoalKind, GoalStatus, JarKey, jarCapabilitiesFor } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { claimFixedCostMatches } from '@/app/_lib/fixed-cost-match';
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
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import {
    createGoalHref,
    createMoveHref,
    createTxHref,
    txDetailHref,
} from '@/app/_lib/create-routes';

/**
 * Per-jar detail — coverage, collapsible categories (fixed costs + activity),
 * goals, period transactions, guide, and CTAs.
 */
export function JarDetailPageClient({ jarKey }: { jarKey: JarKey }) {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);
    const { byKey: catalogByKey } = useJarCatalog();
    const catalog = catalogByKey.get(jarKey);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
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

    const jar = (jarsQuery.data ?? []).find(row => row.key === jarKey);

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

    const fixedGroup = (byJarQuery.data ?? []).find(group => group.jarKey === jarKey);
    const fixedOut = (fixedGroup?.items ?? []).filter(
        item => item.direction === 'OUT' && item.isActive
    );

    const transactions = [...(txQuery.data?.items ?? [])].sort((left, right) =>
        right.bookedOn.localeCompare(left.bookedOn)
    );
    const { claimedTxIds } = claimFixedCostMatches(fixedOut, transactions);
    const leftoverPeriodTxs = transactions.filter(tx => !claimedTxIds.has(tx.id));

    if (!jar) {
        return (
            <div className="grid animate-rise gap-6">
                <Link
                    href="/product/money/jars"
                    className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    ← Jars
                </Link>
                <p className="text-sm text-fg-muted">Loading jar…</p>
            </div>
        );
    }

    const colorClass = jarChrome(jarKey).color;
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
                    ← Jars
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-raised text-xl">
                            {jar.icon ?? catalog?.icon ?? '◇'}
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <Typography as="h1">{jar.name}</Typography>
                            <p className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                {jar.subtitle ?? catalog?.subtitle ?? ''} · {jar.percentage}% of net
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        {caps.canSpend ? (
                            <>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() =>
                                        router.push(
                                            createMoveHref({
                                                fromJarId: jar.id,
                                                returnTo: `/product/money/jars/${jarKeyToSlug(jar.key)}`,
                                            })
                                        )
                                    }>
                                    Move between jars
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => router.push(createTxHref({ jarId: jar.id }))}>
                                    + Add transaction
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
            />

            {/* Categories — expand for fixed costs + period activity */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        ✦ Categories this month
                    </Typography>
                    {allowsFixedCosts ? (
                        <Link
                            href="/product/money/fixed-costs"
                            className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                            All fixed costs ›
                        </Link>
                    ) : null}
                </div>
                <Card className="p-0">
                    <div className="hidden items-center gap-3 border-b border-line px-5 py-2 font-mono text-xs font-medium tracking-wide text-fg-faint uppercase sm:flex">
                        <span className="w-9 shrink-0" aria-hidden />
                        <span className="min-w-0 flex-1">Category</span>
                        <span className="flex min-w-0 flex-1 items-center justify-end gap-6">
                            <span className="w-20 text-right">Planned</span>
                            <span className="w-20 text-right">Spent</span>
                            <span className="w-24 text-right">Over / under</span>
                        </span>
                        <span className="w-3 shrink-0" aria-hidden />
                    </div>
                    <JarCategoryBreakdown
                        categories={[...(jar.categories ?? [])].filter(
                            category => !category.isArchived
                        )}
                        fixedCosts={fixedOut}
                        transactions={transactions}
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
                            ✦ Goals on this jar
                        </Typography>
                        <button
                            type="button"
                            onClick={() => router.push(addGoalHref)}
                            className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                            + Add goal
                        </button>
                    </div>
                    <Card className="p-0">
                        <JarGoalAccordion goals={jarGoals} />
                    </Card>
                </section>
            ) : null}

            {/* Unmatched / one-off activity (bills settled under categories stay there) */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        ✦ Other activity this period
                    </Typography>
                    <Link
                        href="/product/money/transactions"
                        className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        All transactions ›
                    </Link>
                </div>
                <Card className="p-0">
                    {leftoverPeriodTxs.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-fg-muted">
                            {transactions.length === 0
                                ? 'No transactions sorted into this jar this month.'
                                : 'All period payments are nested under categories above.'}
                        </p>
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
                                                <MetaChip>{formatBookedDate(tx.bookedOn)}</MetaChip>
                                            }
                                            onClick={() => router.push(txDetailHref(tx.id))}
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
