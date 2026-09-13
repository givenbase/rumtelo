'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { Card } from '@rumtelo/ui';
import { cn, monthlyAmount, fixedOutNetSummary } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { bgClassToCssVar, cadenceLabel } from '@/app/_lib/jar-chrome';
import { evaluateNecessitiesPressure } from '@/app/_lib/necessities-pressure';
import { isLiveData } from '@/app/_lib/preview';
import { JAR_META } from '@/app/_lib/jar-meta';
import { NecessitiesPressureCard } from '@/components/features/money/necessities-pressure-card';
import { CoachTipCard } from '@/components/features/helpers';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type Tab = 'ERUIT' | 'ERIN';

/**
 * Fixed costs & income.
 * When fixed OUT blows past the Necessities envelope, see NecessitiesPressureCard
 * and doctrine in apps/backend/src/modules/public/product/money/README.md
 * → “When Necessities can’t fit in 55%”.
 */
export function FixedCostsPageClient() {
    const { householdId } = useAuth();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [tab, setTab] = useState<Tab>('ERUIT');
    const [jarFilter, setJarFilter] = useState<string | null>(null);
    const live = isLiveData(householdId);

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    // Flatten byJar groups — keep cadence so OUT totals match jar committedOut.
    const fixedCosts =
        live && byJarQuery.data?.length
            ? byJarQuery.data.flatMap(group =>
                  group.items
                      .filter(item => item.direction === 'OUT' && item.isActive)
                      .map(item => ({
                          id: item.id,
                          name: item.name,
                          counterparty: item.counterparty,
                          amount: item.amount,
                          monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
                          cadence: item.cadence,
                          dueDay: item.dueDay,
                          jarId: group.jarId,
                          jarKey: group.jarKey,
                      }))
              )
            : [];

    const incomeSources =
        live && incomeQuery.data?.length
            ? incomeQuery.data
                  .filter(source => source.isActive)
                  .map(source => ({
                      id: source.id,
                      label: source.name,
                      amount: source.amount,
                      monthly: monthlyAmount(source.amount, source.cadence),
                      cadence: source.cadence,
                      kind: source.kind,
                      dueDay: source.expectedDay,
                  }))
            : [];

    const {
        net: NET,
        outTotal,
        leftover,
        commitmentRatio,
    } = fixedOutNetSummary(
        incomeSources.map(source => ({ amount: source.amount, cadence: source.cadence })),
        fixedCosts.map(item => ({
            amount: item.amount,
            cadence: item.cadence,
            direction: 'OUT' as const,
        })),
        { activeOnly: false }
    );
    const visibleFixedCosts = jarFilter
        ? fixedCosts.filter(fixedCost => fixedCost.jarKey === jarFilter)
        : fixedCosts;

    const necessitiesFixedMonthly = fixedCosts
        .filter(item => item.jarKey === 'NECESSITIES')
        .reduce((total, item) => total + item.monthly, 0);
    const necessitiesPressure = evaluateNecessitiesPressure({
        netMonthlyCents: NET,
        fixedOutMonthlyCents: outTotal,
        necessitiesFixedMonthlyCents: necessitiesFixedMonthly,
    });

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ FIXED COSTS &amp; INCOME
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    Set it up once. Then it runs automatically.
                </h1>
            </div>

            {/* Doctrine: money README → “When Necessities can’t fit in 55%” */}
            <NecessitiesPressureCard pressure={necessitiesPressure} variant="plan" />

            <div data-tour="fixed-tabs">
                <ListToolbar
                    createLabel={tab === 'ERUIT' ? '+ Add fixed cost' : '+ Add income'}
                    onCreate={() =>
                        router.push(tab === 'ERUIT' ? CREATE_HREF.fixed : CREATE_HREF.income)
                    }
                    secondary={
                        <span
                            className={cn(
                                'font-mono text-xs font-medium',
                                leftover >= 0 ? 'text-success' : 'text-danger'
                            )}>
                            {leftover >= 0 ? '+ ' : ''}
                            {formatMoney(leftover)} left after costs
                        </span>
                    }>
                    {(['ERUIT', 'ERIN'] as const).map(tabKey => (
                        <button
                            key={tabKey}
                            type="button"
                            onClick={() => setTab(tabKey)}
                            className={cn(
                                'flex items-center gap-2.5 rounded-full border px-4 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                                tab === tabKey
                                    ? 'border-accent/40 bg-accent-soft text-accent'
                                    : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                            )}>
                            {tabKey === 'ERUIT' ? 'Out' : 'In'}
                            <span
                                className={cn(
                                    'rounded-full px-2 py-0.5 font-mono text-xs',
                                    tab === tabKey
                                        ? 'bg-accent/10 text-accent'
                                        : 'bg-raised text-fg-faint'
                                )}>
                                {tabKey === 'ERUIT' ? formatMoney(outTotal) : formatMoney(NET)}
                            </span>
                        </button>
                    ))}
                </ListToolbar>
            </div>

            {tab === 'ERUIT' && (
                <div data-tour="fixed-list" className="grid items-start gap-5 sm:grid-cols-2">
                    <Card className="p-0">
                        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                            <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                                ✦ Every month out
                            </span>
                            <span className="font-mono text-sm text-fg-secondary">
                                {formatMoney(outTotal)}
                            </span>
                        </div>

                        <div className="grid gap-px">
                            {visibleFixedCosts.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-fg-muted">
                                    {jarFilter
                                        ? 'No fixed costs in this jar.'
                                        : 'No fixed costs yet.'}
                                </p>
                            ) : (
                                visibleFixedCosts.map(fixedCost => {
                                    const jar = JAR_META.find(j => j.key === fixedCost.jarKey);
                                    return (
                                        <button
                                            type="button"
                                            key={fixedCost.id}
                                            onClick={() =>
                                                router.push(updateHref('fixed', fixedCost.id))
                                            }
                                            className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-line px-5 py-3 text-left last:border-b-0 hover:bg-raised">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {jar && (
                                                        <span
                                                            className="size-1.75 shrink-0 rounded-sm"
                                                            style={{
                                                                background: bgClassToCssVar(
                                                                    jar.color
                                                                ),
                                                            }}
                                                        />
                                                    )}
                                                    <span className="text-sm text-fg">
                                                        {fixedCost.name}
                                                    </span>
                                                    {jar && (
                                                        <span className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                                                            {jar.name}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="mt-0.5 font-mono text-xs tracking-normal text-fg-faint">
                                                    {fixedCost.counterparty
                                                        ? `→ ${fixedCost.counterparty} · `
                                                        : ''}
                                                    {cadenceLabel(fixedCost.cadence)}
                                                    {fixedCost.dueDay !== null
                                                        ? ` · day ${fixedCost.dueDay}`
                                                        : ''}
                                                    {fixedCost.cadence !== 'MONTHLY'
                                                        ? ` · ${formatMoney(fixedCost.monthly)}/mo`
                                                        : ''}
                                                </div>
                                            </div>
                                            <span className="font-mono text-sm whitespace-nowrap text-fg">
                                                {formatMoney(-Math.abs(fixedCost.monthly))}
                                            </span>
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
                            {JAR_META.filter(j =>
                                fixedCosts.some(fixedCost => fixedCost.jarKey === j.key)
                            ).map(j => {
                                const on = jarFilter === j.key;
                                return (
                                    <button
                                        key={j.key}
                                        type="button"
                                        onClick={() =>
                                            setJarFilter(previous =>
                                                previous === j.key ? null : j.key
                                            )
                                        }
                                        aria-pressed={on}
                                        className={cn(
                                            'flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-xs transition-colors',
                                            on
                                                ? 'border-accent/40 bg-accent-soft text-accent'
                                                : 'border-line bg-raised text-fg-secondary hover:border-accent-hover hover:text-accent'
                                        )}>
                                        <span
                                            className="size-1.75 rounded-sm"
                                            style={{ background: bgClassToCssVar(j.color) }}
                                        />
                                        {j.name}
                                    </button>
                                );
                            })}
                        </div>
                    </Card>

                    <CoachTipCard title="Subscription check">
                        Check every quarter that everything here still applies. Small amounts add up
                        — a subscription you don&apos;t use is money you throw away monthly.
                        Healthy: less than 20% of Necessity goes to recurring services.
                    </CoachTipCard>
                </div>
            )}

            {tab === 'ERIN' && (
                <div data-tour="fixed-list" className="grid items-start gap-5 sm:grid-cols-2">
                    <Card className="p-0">
                        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                            <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                                ✦ Every month in
                            </span>
                            <span className="font-mono text-sm text-success">
                                {formatMoney(NET)}
                            </span>
                        </div>

                        <div className="grid gap-px">
                            {incomeSources.map((source, i) => (
                                <button
                                    type="button"
                                    key={source.id ?? i}
                                    onClick={() => {
                                        if (!source.id) {
                                            router.push(CREATE_HREF.income);
                                            return;
                                        }
                                        router.push(updateHref('income', source.id));
                                    }}
                                    className="flex w-full cursor-pointer items-center justify-between gap-3 border-b border-line px-5 py-3 text-left last:border-b-0 hover:bg-raised">
                                    <div>
                                        <div className="text-sm text-fg">{source.label}</div>
                                        <div className="mt-0.5 font-mono text-xs tracking-normal text-fg-faint">
                                            {cadenceLabel(source.cadence)}
                                            {source.dueDay !== null
                                                ? ` · pay day ${source.dueDay}`
                                                : ' · pay day'}
                                            {source.cadence !== 'MONTHLY'
                                                ? ` · ${formatMoney(source.monthly)}/mo`
                                                : ''}
                                        </div>
                                    </div>
                                    <span className="font-mono text-sm whitespace-nowrap text-success">
                                        {formatMoney(source.monthly)}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="border-t border-line px-5 py-4">
                            <p className="mb-3 font-mono text-xs tracking-widest text-fg-muted uppercase">
                                How this is split
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {JAR_META.map(j => (
                                    <span
                                        key={j.key}
                                        className="flex items-center gap-1.5 rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary">
                                        <span
                                            className="size-1.75 rounded-sm"
                                            style={{ background: bgClassToCssVar(j.color) }}
                                        />
                                        {j.name}
                                        <span className="text-fg-faint">{j.pct}%</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    </Card>

                    <CoachTipCard title="Is this enough?">
                        {formatMoney(NET)}/mo. Fixed costs take{' '}
                        <strong className="text-fg">{commitmentRatio}%</strong> — that&apos;s{' '}
                        {commitmentRatio < 50
                            ? 'comfortable'
                            : commitmentRatio <= 55
                              ? 'on the edge of the Necessities goal'
                              : 'above the 55% Necessities goal'}
                        .{' '}
                        {commitmentRatio > 55
                            ? 'Simplify bills and/or raise income — do not raid Financial Freedom.'
                            : 'Under 55% there is room to build. The real ceiling is income, not only cutting costs.'}
                    </CoachTipCard>
                </div>
            )}
        </div>
    );
}
