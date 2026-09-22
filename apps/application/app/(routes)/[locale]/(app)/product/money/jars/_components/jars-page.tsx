'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import Link from 'next/link';

import { useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Typography } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import { CREATE_HREF, createTxHref } from '@/app/_lib/create-routes';
import { necessitiesPressureFromJar } from '@/app/_lib/necessities-pressure';
import { isLiveData } from '@/app/_lib/preview';
import { resolveJarSubtitle } from '@/app/_lib/jar-copy';
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
    const t = useTranslations('features.money.jars');
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const periodKey = toPeriodKey(period.year, period.month);
    const live = isLiveData(householdId);

    const dashboardQuery = useLiveQuery(
        apiQuery.money.dashboard.get.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        null,
        live
    );

    const { byKey: catalogByKey } = useJarCatalog();
    const jars = dashboardQuery.data?.jars ?? [];
    const baselineById = new Map(
        (dashboardQuery.data?.baselineJars ?? []).map(jar => [jar.id, jar.allocated] as const)
    );
    const stacked = dashboardQuery.data?.travel?.mode === 'stacked';
    const totalPct = jars.reduce((total, j) => total + j.percentage, 0);
    const onTarget = jars.filter(j => !j.overspent).length;
    const necJar = jars.find(jar => jar.key === 'NECESSITIES');
    const necessitiesPressure = necJar ? necessitiesPressureFromJar(necJar) : null;

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {t('eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {t('lead')}
                </Typography>
            </div>

            <div data-tour="jars-toolbar">
                <ListToolbar
                    secondary={
                        <span className="font-mono text-xs font-medium text-fg-faint">
                            {t('on_track', { on: onTarget, total: jars.length })}
                        </span>
                    }
                    createSlot={
                        <div className="flex flex-wrap items-center gap-2">
                            <Button as={Link} href={CREATE_HREF.move} size="sm" variant="secondary">
                                {t('move_between')}
                            </Button>
                            <Button as={Link} href={createTxHref()} size="sm">
                                {t('add_transaction')}
                            </Button>
                        </div>
                    }>
                    <span className="rounded-full border border-accent/30 bg-accent-soft px-4 py-2 font-mono text-xs font-medium tracking-wide text-accent uppercase">
                        {t('allocated', {
                            count: jars.length,
                            pct: Math.round(totalPct * 10) / 10,
                        })}
                    </span>
                    <span className="font-mono text-xs font-medium text-fg-faint">
                        {t('tap_hint')}
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
                                    subtitle: resolveJarSubtitle(
                                        t,
                                        jar.key,
                                        jar.subtitle,
                                        catalog?.subtitle
                                    ),
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
                                    baselineAllocated: stacked
                                        ? (baselineById.get(jar.id) ?? null)
                                        : null,
                                }}
                            />
                        );
                    })}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 font-mono text-xs text-fg-faint">
                    <span>
                        {stacked
                            ? t('footer_stacked', {
                                  on: onTarget,
                                  total: jars.length,
                                  months: dashboardQuery.data?.travel?.monthsHorizon ?? '—',
                              })
                            : t('footer_period', { on: onTarget, total: jars.length })}
                    </span>
                    <Link
                        href={productPath('growth/income')}
                        className="text-accent underline-offset-2 hover:underline">
                        {t('income_link')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
