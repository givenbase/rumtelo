'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { DEFAULT_JAR_SPLIT, jarCapabilitiesFor, JarKey } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Card } from '@rumtelo/ui';
import { cn, monthlyAmount, fixedOutNetSummary, toPeriodKey } from '@rumtelo/utils';

import { CREATE_HREF, updateHref } from '@/app/_lib/create-routes';
import { bgClassToCssVar, cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    claimFixedCostMatches,
    fixedCostStatus,
    type FixedCostStatus,
} from '@/app/_lib/fixed-cost-match';
import { evaluateNecessitiesPressure } from '@/app/_lib/necessities-pressure';
import { jarChrome } from '@/app/_lib/jar-meta';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { isLiveData } from '@/app/_lib/preview';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { CoachTipCard } from '@/components/features/helpers';
import {
    JarBadge,
    MetaChip,
    formatBookedDate,
    formatDueDay,
} from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { NecessitiesPressureCard } from '@/components/features/money/necessities-pressure-card';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type Tab = 'ERUIT' | 'ERIN';

function statusChip(status: FixedCostStatus) {
    if (status === 'taken') {
        return <MetaChip className="border-success/30 text-success">Taken</MetaChip>;
    }
    if (status === 'due') {
        return <MetaChip className="border-danger/30 text-danger">Still due</MetaChip>;
    }
    return <MetaChip>Planned</MetaChip>;
}

/**
 * Fixed costs & income.
 * When fixed OUT blows past the Necessities envelope, see NecessitiesPressureCard
 * and doctrine in apps/backend/src/modules/public/product/money/README.md
 * → “When Necessities can’t fit in 55%”.
 */
export function FixedCostsPageClient() {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [tab, setTab] = useState<Tab>('ERUIT');
    const [jarFilter, setJarFilter] = useState<string | null>(null);
    const [openJarKeys, setOpenJarKeys] = useState<Set<string>>(() => new Set());
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);

    const byJarQuery = useLiveQuery(
        apiQuery.money.fixedCosts.byJar.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );

    const periodTxQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, period: periodKey, limit: 200 },
        }),
        { items: [], nextCursor: null },
        live
    );

    const incomeQuery = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
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
    const { jars: catalogJars, byKey: jarByKey } = useJarCatalog();
    const splitJars =
        catalogJars.length > 0
            ? catalogJars
            : (Object.values(JarKey) as JarKey[]).map(key => ({
                  key,
                  name: key,
                  color: jarChrome(key).color,
                  pct: DEFAULT_JAR_SPLIT[key],
              }));

    // Flatten byJar groups — keep cadence so OUT totals match jar committedOut.
    const fixedCosts =
        live && byJarQuery.data?.length
            ? byJarQuery.data.flatMap(group =>
                  group.items
                      .filter(item => item.direction === 'OUT' && item.isActive)
                      .map(item => ({
                          ...item,
                          monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
                          jarKey: group.jarKey,
                          jarId: group.jarId,
                      }))
              )
            : [];

    const periodTransactions = periodTxQuery.data?.items ?? [];
    const { matchByFixedCostId } = claimFixedCostMatches(fixedCosts, periodTransactions);

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

    const groupedFixedCosts = splitJars
        .filter(jar => visibleFixedCosts.some(item => item.jarKey === jar.key))
        .map(jar => {
            const items = visibleFixedCosts
                .filter(item => item.jarKey === jar.key)
                .slice()
                .sort((left, right) => {
                    const leftDay = left.dueDay ?? 99;
                    const rightDay = right.dueDay ?? 99;
                    if (leftDay !== rightDay) return leftDay - rightDay;
                    return (left.counterparty ?? left.name).localeCompare(
                        right.counterparty ?? right.name
                    );
                });
            const monthly = items.reduce((total, item) => total + item.monthly, 0);
            return { jar, items, monthly };
        });

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

                        <div className="grid">
                            {groupedFixedCosts.length === 0 ? (
                                <p className="px-5 py-4 text-sm text-fg-muted">
                                    {jarFilter
                                        ? 'No fixed costs in this jar.'
                                        : 'No fixed costs yet.'}
                                </p>
                            ) : (
                                groupedFixedCosts.map(group => {
                                    const open =
                                        openJarKeys.size === 0
                                            ? true
                                            : openJarKeys.has(group.jar.key);
                                    return (
                                        <div key={group.jar.key}>
                                            <button
                                                type="button"
                                                aria-expanded={open}
                                                onClick={() =>
                                                    setOpenJarKeys(previous => {
                                                        const baseline =
                                                            previous.size === 0
                                                                ? new Set(
                                                                      groupedFixedCosts.map(
                                                                          row => row.jar.key
                                                                      )
                                                                  )
                                                                : new Set(previous);
                                                        if (baseline.has(group.jar.key)) {
                                                            baseline.delete(group.jar.key);
                                                        } else {
                                                            baseline.add(group.jar.key);
                                                        }
                                                        return baseline;
                                                    })
                                                }
                                                className="flex w-full items-center justify-between gap-3 border-b border-line bg-raised/60 px-5 py-2 text-left hover:bg-raised">
                                                <JarBadge
                                                    jarKey={group.jar.key}
                                                    name={group.jar.name}
                                                />
                                                <span className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] text-fg-faint">
                                                        {formatMoney(-Math.abs(group.monthly))}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'text-xs text-fg-faint transition-transform duration-200',
                                                            open && 'rotate-180'
                                                        )}>
                                                        ▾
                                                    </span>
                                                </span>
                                            </button>
                                            {open
                                                ? group.items.map(fixedCost => {
                                                      const company =
                                                          fixedCost.counterparty?.trim() ||
                                                          fixedCost.name;
                                                      const subtitle =
                                                          fixedCost.counterparty?.trim() &&
                                                          fixedCost.counterparty.trim() !==
                                                              fixedCost.name.trim()
                                                              ? fixedCost.name
                                                              : null;
                                                      const due = formatDueDay(fixedCost.dueDay);
                                                      const match = matchByFixedCostId.get(
                                                          fixedCost.id
                                                      );
                                                      const status = fixedCostStatus(
                                                          fixedCost,
                                                          match,
                                                          period
                                                      );
                                                      return (
                                                          <MoneyPartyRow
                                                              key={fixedCost.id}
                                                              title={company}
                                                              subtitle={subtitle}
                                                              mark={partyMark(
                                                                  findPartyVendor(
                                                                      company,
                                                                      merchants,
                                                                      givingOrgs
                                                                  ),
                                                                  catalogMarkChrome({
                                                                      billName: fixedCost.name,
                                                                      jarKey: fixedCost.jarKey,
                                                                      jarByKey,
                                                                      categoryTemplates,
                                                                  })
                                                              )}
                                                              amount={formatMoney(
                                                                  -Math.abs(fixedCost.monthly)
                                                              )}
                                                              badges={
                                                                  <>
                                                                      {statusChip(status)}
                                                                      {due ? (
                                                                          <MetaChip>{due}</MetaChip>
                                                                      ) : null}
                                                                      <MetaChip>
                                                                          {cadenceLabel(
                                                                              fixedCost.cadence
                                                                          )}
                                                                      </MetaChip>
                                                                      {match ? (
                                                                          <MetaChip>
                                                                              {formatBookedDate(
                                                                                  match.bookedOn
                                                                              )}
                                                                          </MetaChip>
                                                                      ) : null}
                                                                      {Math.abs(
                                                                          fixedCost.monthly
                                                                      ) !==
                                                                      Math.abs(fixedCost.amount) ? (
                                                                          <MetaChip>
                                                                              {formatMoney(
                                                                                  fixedCost.monthly
                                                                              )}
                                                                              /mo
                                                                          </MetaChip>
                                                                      ) : null}
                                                                  </>
                                                              }
                                                              onClick={() =>
                                                                  router.push(
                                                                      updateHref(
                                                                          'fixed',
                                                                          fixedCost.id
                                                                      )
                                                                  )
                                                              }
                                                          />
                                                      );
                                                  })
                                                : null}
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-line px-5 py-4">
                            {splitJars
                                .filter(
                                    j =>
                                        jarCapabilitiesFor(j.key as JarKey).allowsFixedCosts &&
                                        fixedCosts.some(fixedCost => fixedCost.jarKey === j.key)
                                )
                                .map(j => {
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

                        <div className="grid">
                            {incomeSources.map((source, i) => {
                                const due = formatDueDay(source.dueDay);
                                return (
                                    <MoneyPartyRow
                                        key={source.id ?? i}
                                        title={source.label}
                                        mark={partyMark(
                                            { name: source.label },
                                            catalogMarkChrome({
                                                billName: source.label,
                                                categoryTemplates,
                                            })
                                        )}
                                        amount={formatMoney(source.monthly)}
                                        amountClassName="text-success"
                                        badges={
                                            <>
                                                {due ? <MetaChip>{due}</MetaChip> : null}
                                                <MetaChip>{cadenceLabel(source.cadence)}</MetaChip>
                                                {source.cadence !== 'MONTHLY' ? (
                                                    <MetaChip>
                                                        {formatMoney(source.monthly)}/mo
                                                    </MetaChip>
                                                ) : null}
                                            </>
                                        }
                                        onClick={() => {
                                            if (!source.id) {
                                                router.push(CREATE_HREF.income);
                                                return;
                                            }
                                            router.push(updateHref('income', source.id));
                                        }}
                                    />
                                );
                            })}
                        </div>

                        <div className="border-t border-line px-5 py-4">
                            <p className="mb-3 font-mono text-xs tracking-widest text-fg-muted uppercase">
                                How this is split
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {splitJars.map(j => (
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
