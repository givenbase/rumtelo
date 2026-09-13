'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { Eyebrow, Button } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { CREATE_HREF, createTxHref } from '@/app/_lib/create-routes';
import { necessitiesPressureFromJar } from '@/app/_lib/necessities-pressure';
import { isLiveData } from '@/app/_lib/preview';
import { JAR_META } from '@/app/_lib/jar-meta';
import { productPath } from '@/app/_lib/routes';
import { JarSummaryRow } from '@/components/features/money/jar-summary-row';
import { NecessitiesPressureCard } from '@/components/features/money/necessities-pressure-card';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';

/**
 * Jars screen — design Kluis Finance App.dc.html :689-839.
 * ListToolbar: + Add transaction (Out/In) · Move between jars secondary.
 * Necessities overspent → NecessitiesPressureCard; doctrine in
 * apps/backend/src/modules/public/product/money/README.md
 * → “When Necessities can’t fit in 55%”.
 * Income what-ifs live on Growth → Income (`IncomeSimulator`) — the lever there is income.
 */
export function JarsPageClient() {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const jars = jarsQuery.data ?? [];
    const totalPct = jars.reduce((total, j) => total + j.percentage, 0);
    const onTarget = jars.filter(j => !j.overspent).length;
    const necJar = jars.find(jar => jar.key === 'NECESSITIES');
    const necessitiesPressure = necJar ? necessitiesPressureFromJar(necJar) : null;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Eyebrow className="text-accent">✦ THE SIX JARS</Eyebrow>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    Every coin gets a job before it arrives.
                </h1>
                <p className="mt-2 max-w-prose text-base text-pretty text-fg-muted">
                    Income lands, the split happens the same second. Financial Freedom is never
                    spent — only invested.
                </p>
            </div>

            <div data-tour="jars-toolbar">
                <ListToolbar
                    secondary={
                        <span className="font-mono text-xs font-medium text-fg-faint">
                            {onTarget} / {jars.length} on track
                        </span>
                    }
                    createSlot={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => router.push(CREATE_HREF.move)}>
                                Move between jars
                            </Button>
                            <Button size="sm" onClick={() => router.push(createTxHref())}>
                                + Add transaction
                            </Button>
                        </div>
                    }>
                    <span className="rounded-full border border-accent/30 bg-accent-soft px-4 py-2 font-mono text-xs font-medium tracking-wide text-accent uppercase">
                        {jars.length} jars · {Math.round(totalPct * 10) / 10}% allocated
                    </span>
                    <span className="font-mono text-xs font-medium text-fg-faint">
                        Tap a jar for fixed costs, spends, and what is left
                    </span>
                </ListToolbar>
            </div>

            <div data-tour="jars-list">
                {/* Doctrine: money README → “When Necessities can’t fit in 55%” */}
                {necessitiesPressure?.active ? (
                    <div className="mb-4">
                        <NecessitiesPressureCard pressure={necessitiesPressure} variant="jar" />
                    </div>
                ) : null}

                <div className="grid gap-2">
                    {jars.map(jar => {
                        const meta = JAR_META.find(entry => entry.key === jar.key);
                        return (
                            <JarSummaryRow
                                key={jar.id}
                                jar={{
                                    id: jar.id,
                                    key: jar.key,
                                    name: jar.name,
                                    subtitle: jar.subtitle ?? meta?.subtitle ?? '',
                                    icon: jar.icon ?? meta?.icon ?? '◇',
                                    color: meta?.color ?? 'bg-jar-nec',
                                    percentage: jar.percentage,
                                    allocated: jar.allocated,
                                    available: jar.available,
                                    spent: jar.spent,
                                    credited: jar.credited,
                                    committedOut: jar.committedOut,
                                    overspent: jar.overspent,
                                    categoryCount: jar.categories?.length ?? 0,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-xs text-fg-faint">
                    <span>
                        {onTarget} / {jars.length} jars on track this period
                    </span>
                    <Link
                        href={productPath('growth/income')}
                        className="text-accent underline-offset-2 hover:underline">
                        What would a raise do to these jars? → Income
                    </Link>
                </div>
            </div>
        </div>
    );
}
