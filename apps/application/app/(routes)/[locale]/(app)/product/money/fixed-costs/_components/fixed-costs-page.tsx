'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { useState } from 'react';

import { DEFAULT_JAR_SPLIT, jarCapabilitiesFor, JarKey } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { useLiveQuery } from '@rumtelo/hooks';
import { Card, Typography } from '@rumtelo/ui';
import {
    cn,
    describePeriodTravel,
    fixedOutNetSummary,
    horizonMonths,
    monthlyAmount,
    toPeriodKey,
} from '@rumtelo/utils';

import { CREATE_HREF, fixedDetailHref, updateHref } from '@/app/_lib/create-routes';
import { bgClassToCssVar, cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    fixedCostLifecycle,
    fixedCostStatus,
    isFixedCostCounting,
    lifecycleLabel,
    settlementsByFixedCostId,
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

function statusChip(status: FixedCostStatus, t: (key: string) => string) {
    if (status === 'taken') {
        return <MetaChip className="border-success/30 text-success">{t('status_taken')}</MetaChip>;
    }
    if (status === 'due') {
        return <MetaChip className="border-danger/30 text-danger">{t('status_due')}</MetaChip>;
    }
    if (status === 'skipped') {
        return <MetaChip className="border-line text-fg-muted">{t('status_skipped')}</MetaChip>;
    }
    return <MetaChip>{t('status_planned')}</MetaChip>;
}

/**
 * Fixed costs & income.
 * When fixed OUT blows past the Necessities envelope, see NecessitiesPressureCard
 * and doctrine in apps/backend/src/modules/public/product/money/README.md
 * → “When Necessities can’t fit in 55%”.
 */
export function FixedCostsPageClient() {
    const t = useTranslations('features.money.fixed');
    const tChips = useTranslations('features.money.chips');
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const [tab, setTab] = useState<Tab>('ERUIT');
    const [jarFilter, setJarFilter] = useState<string | null>(null);
    const [openJarKeys, setOpenJarKeys] = useState<Set<string>>(() => new Set());
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    const travel = describePeriodTravel(period);
    const horizon = horizonMonths(travel);
    const traveling = travel.direction !== 'current';

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

    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
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
    const allFixedOut =
        live && byJarQuery.data?.length
            ? byJarQuery.data.flatMap(group =>
                  group.items
                      .filter(item => item.direction === 'OUT')
                      .map(item => ({
                          ...item,
                          monthly: monthlyAmount(Math.abs(item.amount), item.cadence),
                          jarKey: group.jarKey,
                          jarId: group.jarId,
                      }))
              )
            : [];
    const fixedCosts = allFixedOut.filter(isFixedCostCounting);
    const inactiveFixedCosts = allFixedOut.filter(item => !isFixedCostCounting(item));

    const periodTransactions = periodTxQuery.data?.items ?? [];
    const settlementById = settlementsByFixedCostId(settlementsQuery.data ?? []);
    const txById = new Map(periodTransactions.map(tx => [tx.id, tx]));

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
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ {t('eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('title')}
                </Typography>
                {traveling ? (
                    <Typography as="p" variant="lead" size="default" className="mt-2">
                        {t('travel_lead', {
                            months: horizon,
                            outTotal: formatMoney(outTotal * horizon),
                            netTotal: formatMoney(NET * horizon),
                        })}
                    </Typography>
                ) : null}
            </div>

            {/* Doctrine: money README → “When Necessities can’t fit in 55%” */}
            <NecessitiesPressureCard pressure={necessitiesPressure} variant="plan" />

            <div data-tour="fixed-tabs">
                <ListToolbar
                    createLabel={tab === 'ERUIT' ? t('add_fixed') : t('add_income')}
                    createHref={tab === 'ERUIT' ? CREATE_HREF.fixed : CREATE_HREF.income}
                    secondary={
                        <span
                            className={cn(
                                'font-mono text-xs font-medium',
                                leftover >= 0 ? 'text-success' : 'text-danger'
                            )}>
                            {traveling
                                ? t('leftover_travel', {
                                      amount: `${leftover >= 0 ? '+ ' : ''}${formatMoney(leftover)}`,
                                      horizon: formatMoney(leftover * horizon),
                                      months: horizon,
                                  })
                                : t('leftover', {
                                      amount: `${leftover >= 0 ? '+ ' : ''}${formatMoney(leftover)}`,
                                  })}
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
                            {tabKey === 'ERUIT' ? t('tab_out') : t('tab_in')}
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
                <div data-tour="fixed-list" className="grid gap-5">
                    <div className="grid items-start gap-5 sm:grid-cols-2">
                        <Card className="p-0">
                            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                                <Typography as="span" variant="eyebrow" color="primary">
                                    ✦ {t('every_month_out')}
                                </Typography>
                                <span className="font-mono text-sm text-fg-secondary">
                                    {formatMoney(outTotal)}
                                </span>
                            </div>

                            <div className="grid">
                                {groupedFixedCosts.length === 0 ? (
                                    <p className="px-5 py-4 text-sm text-fg-muted">
                                        {jarFilter ? t('empty_jar') : t('empty_all')}
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
                                                          const due = formatDueDay(
                                                              fixedCost.dueDay,
                                                              tChips
                                                          );
                                                          const settlement = settlementById.get(
                                                              fixedCost.id
                                                          );
                                                          const status = fixedCostStatus(
                                                              fixedCost,
                                                              settlement,
                                                              period
                                                          );
                                                          const linkedTx = settlement?.transactionId
                                                              ? txById.get(settlement.transactionId)
                                                              : undefined;
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
                                                                          {statusChip(status, t)}
                                                                          {due ? (
                                                                              <MetaChip>
                                                                                  {due}
                                                                              </MetaChip>
                                                                          ) : null}
                                                                          <MetaChip>
                                                                              {cadenceLabel(
                                                                                  fixedCost.cadence,
                                                                                  tChips
                                                                              )}
                                                                          </MetaChip>
                                                                          {linkedTx ? (
                                                                              <MetaChip>
                                                                                  {formatBookedDate(
                                                                                      linkedTx.bookedOn,
                                                                                      appLocale
                                                                                  )}
                                                                              </MetaChip>
                                                                          ) : null}
                                                                          {Math.abs(
                                                                              fixedCost.monthly
                                                                          ) !==
                                                                          Math.abs(
                                                                              fixedCost.amount
                                                                          ) ? (
                                                                              <MetaChip>
                                                                                  {tChips(
                                                                                      'amount_per_month',
                                                                                      {
                                                                                          amount: formatMoney(
                                                                                              fixedCost.monthly
                                                                                          ),
                                                                                      }
                                                                                  )}
                                                                              </MetaChip>
                                                                          ) : null}
                                                                      </>
                                                                  }
                                                                  href={fixedDetailHref(
                                                                      fixedCost.id
                                                                  )}
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

                        <CoachTipCard title={t('coach_subscription_title')}>
                            {t('coach_subscription_body')}
                        </CoachTipCard>
                    </div>

                    {inactiveFixedCosts.length > 0 ? (
                        <Card className="p-0">
                            <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                                <Typography as="span" variant="eyebrow" color="muted">
                                    ✦ {t('paused_ended')}
                                </Typography>
                                <span className="font-mono text-xs text-fg-faint">
                                    {inactiveFixedCosts.length}
                                </span>
                            </div>
                            <div className="grid opacity-80">
                                {inactiveFixedCosts
                                    .slice()
                                    .sort((left, right) =>
                                        (left.counterparty ?? left.name).localeCompare(
                                            right.counterparty ?? right.name
                                        )
                                    )
                                    .map(fixedCost => {
                                        const company =
                                            fixedCost.counterparty?.trim() || fixedCost.name;
                                        const subtitle =
                                            fixedCost.counterparty?.trim() &&
                                            fixedCost.counterparty.trim() !== fixedCost.name.trim()
                                                ? fixedCost.name
                                                : null;
                                        const lifecycle = fixedCostLifecycle(fixedCost);
                                        return (
                                            <MoneyPartyRow
                                                key={fixedCost.id}
                                                title={company}
                                                subtitle={subtitle}
                                                mark={partyMark(
                                                    findPartyVendor(company, merchants, givingOrgs),
                                                    catalogMarkChrome({
                                                        billName: fixedCost.name,
                                                        jarKey: fixedCost.jarKey,
                                                        jarByKey,
                                                        categoryTemplates,
                                                    })
                                                )}
                                                amount={formatMoney(-Math.abs(fixedCost.monthly))}
                                                badges={
                                                    <>
                                                        <MetaChip className="text-fg-muted">
                                                            {lifecycleLabel(lifecycle, {
                                                                active: t('lifecycle_active'),
                                                                paused: t('lifecycle_paused'),
                                                                ended: t('lifecycle_ended'),
                                                            })}
                                                        </MetaChip>
                                                        <JarBadge
                                                            jarKey={fixedCost.jarKey}
                                                            name={
                                                                splitJars.find(
                                                                    jar =>
                                                                        jar.key === fixedCost.jarKey
                                                                )?.name ?? fixedCost.jarKey
                                                            }
                                                        />
                                                    </>
                                                }
                                                href={fixedDetailHref(fixedCost.id)}
                                            />
                                        );
                                    })}
                            </div>
                        </Card>
                    ) : null}
                </div>
            )}

            {tab === 'ERIN' && (
                <div data-tour="fixed-list" className="grid items-start gap-5 sm:grid-cols-2">
                    <Card className="p-0">
                        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                            <Typography as="span" variant="eyebrow" color="primary">
                                ✦ {t('every_month_in')}
                            </Typography>
                            <span className="font-mono text-sm text-success">
                                {formatMoney(NET)}
                            </span>
                        </div>

                        <div className="grid">
                            {incomeSources.map((source, i) => {
                                const due = formatDueDay(source.dueDay, tChips);
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
                                                <MetaChip>
                                                    {cadenceLabel(source.cadence, tChips)}
                                                </MetaChip>
                                                {source.cadence !== 'MONTHLY' ? (
                                                    <MetaChip>
                                                        {tChips('amount_per_month', {
                                                            amount: formatMoney(source.monthly),
                                                        })}
                                                    </MetaChip>
                                                ) : null}
                                            </>
                                        }
                                        href={
                                            source.id
                                                ? updateHref('income', source.id)
                                                : CREATE_HREF.income
                                        }
                                    />
                                );
                            })}
                        </div>

                        <div className="border-t border-line px-5 py-4">
                            <Typography as="p" variant="eyebrow" color="muted" className="mb-3">
                                {t('how_split')}
                            </Typography>
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

                    <CoachTipCard title={t('coach_enough_title')}>
                        {tChips('amount_per_month', { amount: formatMoney(NET) })}.{' '}
                        {t('coach_enough_ratio_line', { ratio: commitmentRatio })}{' '}
                        {commitmentRatio < 50
                            ? t('coach_enough_comfortable')
                            : commitmentRatio <= 55
                              ? t('coach_enough_edge')
                              : t('coach_enough_above')}
                        .{' '}
                        {commitmentRatio > 55 ? t('coach_enough_simplify') : t('coach_enough_room')}
                    </CoachTipCard>
                </div>
            )}
        </div>
    );
}
