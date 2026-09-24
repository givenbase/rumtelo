'use client';

import Link from 'next/link';
import { useState } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { AccentCard, Button, Card, EmptyState, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useLiveQuery } from '@rumtelo/hooks';
import {
    netWorthDebtCents,
    netWorthHoldingsCents,
    netWorthJarsCents,
    type Asset,
    type AssetKind,
    type Debt,
    type JarBalance,
} from '@rumtelo/contracts';

import { apiQuery } from '@/app/_lib/api-hooks';
import { CREATE_HREF, assetDetailHref, createAssetHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const EMPTY_KINDS: AssetKind[] = [];
const EMPTY_ASSETS: Asset[] = [];
const EMPTY_DEBTS: Debt[] = [];
const EMPTY_JARS: JarBalance[] = [];

/**
 * BOARD — net worth board + assets + month score + level ladder + log.
 * Design: Kluis Finance App.dc.html:1236-1357 (MIJN VERMOGEN).
 * Formula: holdings + LTS/Freedom jars − open debts.
 */
export function NetWorthPageClient() {
    const t = useTranslations('features.growth.net_worth');
    const { formatMoney } = useHouseholdCurrency();
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const kindsQuery = useLiveQuery(
        apiQuery.growth.catalogs.assetKinds.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_KINDS,
        live
    );
    const assetsQuery = useLiveQuery(
        apiQuery.growth.assets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_ASSETS,
        live
    );
    const debtsQuery = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_DEBTS,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_JARS,
        live
    );
    const kinds = kindsQuery.data ?? EMPTY_KINDS;
    const [filter, setFilter] = useState('all');
    const assetRows = assetsQuery.data ?? EMPTY_ASSETS;
    const debtRows = debtsQuery.data ?? EMPTY_DEBTS;
    const jarRows = jarsQuery.data ?? EMPTY_JARS;
    const holdings = assetRows.map(asset => {
        const kind = kinds.find(row => row.key === asset.kindKey);
        return { ...asset, locked: kind ? !kind.canPay : false };
    });

    const assetWorth = netWorthHoldingsCents(assetRows);
    const jarsCash = netWorthJarsCents(jarRows);
    const totalDebt = netWorthDebtCents(debtRows);
    const monthlyPassive = holdings
        .filter(holding => !holding.locked)
        .reduce((total, holding) => total + holding.flow, 0);
    const totalValue = assetWorth + jarsCash;
    const netWorth = totalValue - totalDebt;

    const presentKinds = kinds.filter(kind =>
        holdings.some(holding => holding.kindKey === kind.key)
    );

    const groups: Array<{
        key: string;
        name: string;
        description: string | null;
        canPay: boolean;
        items: Array<(typeof holdings)[number]>;
        total: number;
        flow: number;
        flowLabel: string;
    }> = [];

    for (const meta of kinds) {
        if (filter !== 'all' && filter !== meta.key) continue;
        const items = holdings.filter(holding => holding.kindKey === meta.key);
        if (items.length === 0) continue;
        const total = items.reduce((running, holding) => running + holding.value, 0);
        const flow = items.reduce((running, holding) => running + holding.flow, 0);
        groups.push({
            key: meta.key,
            name: meta.name,
            description: meta.description,
            canPay: meta.canPay,
            items,
            total,
            flow,
            flowLabel: !meta.canPay
                ? t('flow_none')
                : flow > 0
                  ? t('flow_per_month', { amount: formatMoney(flow) })
                  : t('flow_none_pm'),
        });
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('page_eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('page_title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {t('page_lead')}
                </Typography>
            </div>

            <ListToolbar createLabel={t('add_asset')} createHref={CREATE_HREF.asset} />

            <AccentCard tint="var(--color-accent)">
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('horizon_eyebrow')}
                </Typography>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {(
                        [
                            {
                                label: t('stat_holdings'),
                                value: formatMoney(assetWorth),
                                tone: 'text-fg',
                                rail: 'var(--color-accent)',
                            },
                            {
                                label: t('stat_jars'),
                                value: formatMoney(jarsCash),
                                tone: 'text-fg',
                                rail: 'var(--color-jar-lts)',
                            },
                            {
                                label: t('stat_monthly_income'),
                                value:
                                    monthlyPassive === 0
                                        ? t('none_yet')
                                        : formatMoney(monthlyPassive),
                                tone: '',
                                rail: 'var(--color-jar-give)',
                                ink: 'var(--color-jar-give)',
                            },
                            {
                                label: t('stat_debt'),
                                value: formatMoney(totalDebt),
                                tone: 'text-danger',
                                rail: 'var(--color-danger)',
                            },
                        ] satisfies Array<{
                            label: string;
                            value: string;
                            tone: string;
                            rail: string;
                            ink?: string;
                        }>
                    ).map(figure => (
                        <div
                            key={figure.label}
                            className="flex overflow-hidden rounded-xl border border-line bg-bg-app">
                            <span
                                aria-hidden
                                className="w-1 shrink-0"
                                style={{ background: figure.rail }}
                            />
                            <div className="grid min-w-0 gap-1.5 px-3 py-3 sm:px-3.5">
                                <Eyebrow>{figure.label}</Eyebrow>
                                <p
                                    className={cn(
                                        'font-display text-base leading-none font-semibold tracking-tight whitespace-nowrap sm:text-2xl',
                                        figure.tone
                                    )}
                                    style={figure.ink ? { color: figure.ink } : undefined}>
                                    {figure.value}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                <Typography
                    as="p"
                    size="sm"
                    color="muted"
                    className="mt-4 border-t border-line pt-4 text-pretty">
                    {t('summary', {
                        net: formatMoney(netWorth),
                        owned: formatMoney(totalValue),
                        owed: formatMoney(totalDebt),
                    })}
                </Typography>
            </AccentCard>

            {holdings.length === 0 ? (
                <EmptyState icon="trending-up" title={t('empty_title')} body={t('empty_body')} />
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 font-mono text-xs font-medium tracking-widest text-fg-muted uppercase">
                            {t('show')}
                        </span>
                        {(
                            [
                                {
                                    key: 'all' as const,
                                    label: `${t('filter_all')}  ${holdings.length}`,
                                },
                                ...presentKinds.map(k => ({
                                    key: k.key,
                                    label: `${k.name}  ${holdings.filter(holding => holding.kindKey === k.key).length}`,
                                })),
                            ] as const
                        ).map(filterOption => (
                            <button
                                key={filterOption.key}
                                type="button"
                                onClick={() => setFilter(filterOption.key)}
                                className={cn(
                                    'rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium tracking-wide uppercase transition-colors',
                                    filter === filterOption.key
                                        ? 'border-accent/40 bg-accent-soft text-accent'
                                        : 'border-line text-fg-secondary hover:border-accent-hover hover:text-accent'
                                )}>
                                {filterOption.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4">
                        {groups.map(group => (
                            <Card key={group.key} className="overflow-hidden p-0">
                                <div className="flex flex-wrap items-start gap-4 border-b border-line px-5 py-4">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex flex-wrap items-baseline gap-2.5">
                                            <Typography as="h3" size="lg">
                                                {group.name}
                                            </Typography>
                                            <span className="font-mono text-xs tracking-wide text-fg-muted uppercase">
                                                {group.items.length === 1
                                                    ? t('asset_one')
                                                    : t('asset_many', {
                                                          count: group.items.length,
                                                      })}
                                            </span>
                                        </div>
                                        <Typography
                                            as="p"
                                            size="sm"
                                            color="muted"
                                            className="mt-1 text-pretty">
                                            {group.description}
                                        </Typography>
                                    </div>
                                    <div className="grid justify-items-end gap-1">
                                        <span className="font-display text-2xl leading-none font-semibold tracking-tight text-fg">
                                            {formatMoney(group.total)}
                                        </span>
                                        <span
                                            className={cn(
                                                'font-mono text-xs',
                                                !group.canPay || group.flow <= 0
                                                    ? 'text-fg-muted'
                                                    : 'text-accent'
                                            )}>
                                            {group.flowLabel}
                                        </span>
                                    </div>
                                    <Button
                                        as={Link}
                                        href={createAssetHref(group.key)}
                                        size="sm"
                                        variant="secondary"
                                        className="self-center">
                                        {t('add_kind', { name: group.name })}
                                    </Button>
                                </div>
                                <div className="grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.items.map(holding => {
                                        const pays = !holding.locked && holding.flow > 0;
                                        return (
                                            <Link
                                                key={holding.id}
                                                href={assetDetailHref(holding.id)}
                                                aria-label={holding.name}
                                                className={cn(
                                                    'grid cursor-pointer gap-0 overflow-hidden rounded-xl border bg-raised text-left transition-colors hover:border-accent-hover',
                                                    pays
                                                        ? 'border-accent/40 shadow-glow'
                                                        : 'border-line'
                                                )}>
                                                <div
                                                    className="h-8.5"
                                                    style={{
                                                        background: holding.locked
                                                            ? 'repeating-linear-gradient(45deg, var(--color-sunken) 0 3px, transparent 3px 9px)'
                                                            : pays
                                                              ? 'var(--gradient-accent)'
                                                              : 'repeating-linear-gradient(45deg, var(--color-sunken) 0 8px, var(--color-raised) 8px 16px)',
                                                    }}
                                                />
                                                <div className="grid gap-2 p-4">
                                                    <span className="font-mono text-xs font-medium tracking-wide text-fg-muted uppercase">
                                                        {holding.kindKey === 'PENSION'
                                                            ? t('holding_pension')
                                                            : holding.locked
                                                              ? t('holding_locked')
                                                              : pays
                                                                ? t('holding_pays')
                                                                : t('holding_appreciates')}
                                                    </span>
                                                    <Typography
                                                        as="h3"
                                                        size="lg"
                                                        className="leading-snug">
                                                        {holding.name}
                                                    </Typography>
                                                    <div className="flex justify-between font-mono text-xs">
                                                        <span className="text-fg-muted">
                                                            {t('value')}
                                                        </span>
                                                        <span className="text-fg-secondary">
                                                            {formatMoney(holding.value)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-mono text-xs">
                                                        <span className="text-fg-muted">
                                                            {t('monthly_income')}
                                                        </span>
                                                        <span
                                                            className={
                                                                pays
                                                                    ? 'text-accent'
                                                                    : 'text-fg-muted'
                                                            }>
                                                            {holding.locked
                                                                ? t('not_available_yet')
                                                                : pays
                                                                  ? t('flow_per_month', {
                                                                        amount: formatMoney(
                                                                            holding.flow
                                                                        ),
                                                                    })
                                                                  : `${formatMoney(0)} ${t('per_month_short')}`}
                                                        </span>
                                                    </div>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            </Card>
                        ))}
                    </div>
                </>
            )}

            <Section eyebrow={t('month_score_eyebrow')} title={t('month_score_title')}>
                <EmptyState
                    icon="diamond"
                    title={t('month_score_empty_title')}
                    body={t('month_score_empty_body')}
                />
            </Section>
        </div>
    );
}
