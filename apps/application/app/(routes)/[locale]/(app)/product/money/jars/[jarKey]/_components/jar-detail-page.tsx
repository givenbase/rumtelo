'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { JarKey } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card } from '@rumtelo/ui';
import { cn, monthlyAmount, toPeriodKey } from '@rumtelo/utils';

import { createMoveHref, createTxHref, updateHref } from '@/app/_lib/create-routes';
import { cadenceLabel } from '@/app/_lib/jar-chrome';
import type { JarGuideKey } from '@/app/_lib/jar-guide';
import { JAR_META } from '@/app/_lib/jar-meta';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { isLiveData } from '@/app/_lib/preview';
import { JarGuideCard } from '@/components/features/helpers';
import { JarCoverageStrip } from '@/components/features/money/jar-coverage-strip';
import { JarCategoryTable } from '@/components/features/money/jar-drilldown-parts';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

/**
 * Per-jar detail — coverage (allocated / committed / spent / available),
 * categories, fixed costs, period transactions, guide, and CTAs.
 */
export function JarDetailPageClient({ jarKey }: { jarKey: JarKey }) {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);
    const meta = JAR_META.find(entry => entry.key === jarKey);
    const guideKey = jarKey as JarGuideKey;

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

    const colorClass = meta?.color ?? 'bg-jar-nec';

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
                            {jar.icon ?? meta?.icon ?? '◇'}
                        </span>
                        <div className="grid min-w-0 gap-1">
                            <h1 className="font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                                {jar.name}
                            </h1>
                            <p className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase">
                                {jar.subtitle ?? meta?.subtitle ?? ''} · {jar.percentage}% of net
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
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
            />

            {/* Categories */}
            <section className="grid gap-3">
                <h2 className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ Categories this month
                </h2>
                <Card className="p-4">
                    <JarCategoryTable
                        categories={[...(jar.categories ?? [])]
                            .filter(category => !category.isArchived)
                            .sort(
                                (left, right) =>
                                    right.budgeted - left.budgeted || right.actual - left.actual
                            )}
                    />
                </Card>
            </section>

            {/* Fixed costs */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        ✦ Fixed costs
                    </h2>
                    <Link
                        href="/product/money/fixed-costs"
                        className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        All fixed costs ›
                    </Link>
                </div>
                <Card className="p-0">
                    {fixedOut.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-fg-muted">
                            No active fixed costs on this jar.
                        </p>
                    ) : (
                        <ul className="grid gap-px">
                            {fixedOut.map(item => {
                                const monthly = monthlyAmount(item.amount, item.cadence);
                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                router.push(updateHref('fixed', item.id))
                                            }
                                            className="flex w-full items-center justify-between gap-3 border-b border-line px-5 py-3 text-left last:border-b-0 hover:bg-raised">
                                            <span className="min-w-0">
                                                <span className="block text-sm text-fg">
                                                    {item.name}
                                                </span>
                                                <span className="mt-0.5 block font-mono text-xs text-fg-faint">
                                                    {item.counterparty
                                                        ? `→ ${item.counterparty} · `
                                                        : ''}
                                                    {cadenceLabel(item.cadence)}
                                                    {item.dueDay !== null
                                                        ? ` · day ${item.dueDay}`
                                                        : ''}
                                                    {item.cadence !== 'MONTHLY'
                                                        ? ` · ${formatMoney(monthly)}/mo`
                                                        : ''}
                                                </span>
                                            </span>
                                            <span className="shrink-0 font-mono text-sm text-fg">
                                                {formatMoney(-Math.abs(monthly))}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>
            </section>

            {/* Period transactions */}
            <section className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        ✦ This period
                    </h2>
                    <Link
                        href="/product/money/transactions"
                        className="font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        All transactions ›
                    </Link>
                </div>
                <Card className="p-0">
                    {transactions.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-fg-muted">
                            No transactions sorted into this jar this month.
                        </p>
                    ) : (
                        <ul className="grid gap-px">
                            {transactions.map(tx => (
                                <li key={tx.id}>
                                    <button
                                        type="button"
                                        onClick={() => router.push(updateHref('tx', tx.id))}
                                        className="flex w-full items-center justify-between gap-3 border-b border-line px-5 py-3 text-left last:border-b-0 hover:bg-raised">
                                        <span className="min-w-0">
                                            <span className="block truncate text-sm text-fg">
                                                {tx.counterparty || tx.description}
                                            </span>
                                            <span className="mt-0.5 block font-mono text-xs text-fg-faint">
                                                {tx.bookedOn}
                                                {tx.counterparty && tx.description
                                                    ? ` · ${tx.description}`
                                                    : ''}
                                            </span>
                                        </span>
                                        <span
                                            className={cn(
                                                'shrink-0 font-mono text-sm',
                                                tx.amount < 0 ? 'text-fg' : 'text-success'
                                            )}>
                                            {formatMoney(tx.amount)}
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </section>

            <JarGuideCard jarKey={guideKey} allocatedCents={jar.allocated} />
        </div>
    );
}
