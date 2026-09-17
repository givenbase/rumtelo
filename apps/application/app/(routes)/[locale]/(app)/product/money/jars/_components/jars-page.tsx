'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { CREATE_HREF, createTxHref } from '@/app/_lib/create-routes';
import { necessitiesPressureFromJar } from '@/app/_lib/necessities-pressure';
import { isLiveData } from '@/app/_lib/preview';
import { jarChrome } from '@/app/_lib/jar-meta';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
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

    const { byKey: catalogByKey } = useJarCatalog();
    const jars = jarsQuery.data ?? [];
    const totalPct = jars.reduce((total, j) => total + j.percentage, 0);
    const onTarget = jars.filter(j => !j.overspent).length;
    const necJar = jars.find(jar => jar.key === 'NECESSITIES');
    const necessitiesPressure = necJar ? necessitiesPressureFromJar(necJar) : null;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ THE SIX JARS
                </Typography>
                <Typography as="h1" className="mt-2">
                    Every coin gets a job before it arrives.
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    Income lands, the split happens the same second. Financial Freedom is never
                    spent — only invested.
                </Typography>
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
                        const catalog = catalogByKey.get(jar.key);
                        return (
                            <JarSummaryRow
                                key={jar.id}
                                jar={{
                                    id: jar.id,
                                    key: jar.key,
                                    name: jar.name,
                                    subtitle: jar.subtitle ?? catalog?.subtitle ?? '',
                                    icon: jar.icon ?? catalog?.icon ?? '◇',
                                    color: jarChrome(jar.key).color,
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
