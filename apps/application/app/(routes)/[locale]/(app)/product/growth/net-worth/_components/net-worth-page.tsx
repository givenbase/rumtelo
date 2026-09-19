'use client';

import Link from 'next/link';
import { useState } from 'react';

import { AccentCard, Button, Card, EmptyState, Eyebrow, Section, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useLiveQuery } from '@rumtelo/hooks';
import type { Asset, AssetKind } from '@rumtelo/contracts';

import { apiQuery } from '@/app/_lib/api-hooks';
import { CREATE_HREF, assetDetailHref, createAssetHref } from '@/app/_lib/create-routes';
import { isLiveData } from '@/app/_lib/preview';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

const TOTAL_DEBT = 0;
const EMPTY_KINDS: AssetKind[] = [];
const EMPTY_ASSETS: Asset[] = [];

/**
 * BOARD — net worth board + assets + month score + level ladder + log.
 * Design: Kluis Finance App.dc.html:1236-1357 (MIJN VERMOGEN).
 */
export function NetWorthPageClient() {
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
    const kinds = kindsQuery.data ?? EMPTY_KINDS;
    const [filter, setFilter] = useState('all');
    const holdings = (assetsQuery.data ?? EMPTY_ASSETS).map(asset => {
        const kind = kinds.find(row => row.key === asset.kindKey);
        return { ...asset, locked: kind ? !kind.canPay : false };
    });

    const assetWorth = holdings.reduce((total, holding) => total + holding.value, 0);
    const monthlyPassive = holdings
        .filter(holding => !holding.locked)
        .reduce((total, holding) => total + holding.flow, 0);
    const netWorth = assetWorth - TOTAL_DEBT;

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
                ? 'no income'
                : flow > 0
                  ? `+ ${formatMoney(flow)} p/m`
                  : 'no income p/m',
        });
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ MY NET WORTH
                </Typography>
                <Typography as="h1" className="mt-2">
                    Where your money stands — not how it moves.
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    Everything you own minus everything you owe. A tile turns gold the moment it
                    pays you every month — that is the difference between owning something and
                    having it.
                </Typography>
            </div>

            <ListToolbar createLabel="+ Add asset" createHref={CREATE_HREF.asset} />

            <AccentCard tint="var(--color-accent)">
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ How far this takes you
                </Typography>
                <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {(
                        [
                            {
                                label: 'Total value',
                                value: formatMoney(assetWorth),
                                tone: 'text-fg',
                                rail: 'var(--color-accent)',
                            },
                            {
                                label: 'Monthly income',
                                value:
                                    monthlyPassive === 0 ? 'None yet' : formatMoney(monthlyPassive),
                                tone: '',
                                rail: 'var(--color-jar-give)',
                                ink: 'var(--color-jar-give)',
                            },
                            {
                                label: 'Your life costs',
                                value: formatMoney(0),
                                tone: 'text-fg',
                                rail: 'var(--color-fg-muted)',
                            },
                            {
                                label: 'Total debt',
                                value: formatMoney(TOTAL_DEBT),
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
                    Your net worth is <strong className="text-fg">{formatMoney(netWorth)}</strong>.
                    Everything you add to Financial Freedom works for you — forever.
                </Typography>
            </AccentCard>

            {holdings.length === 0 ? (
                <EmptyState
                    icon="↗"
                    title="Nog geen data"
                    body="Voeg je eerste asset toe om je vermogen te volgen. Binnenkort koppel je ook schulden en maandscore hier."
                />
            ) : (
                <>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="mr-1 font-mono text-xs font-medium tracking-widest text-fg-muted uppercase">
                            Show
                        </span>
                        {(
                            [
                                { key: 'all' as const, label: `All  ${holdings.length}` },
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
                                                    ? '1 asset'
                                                    : `${group.items.length} assets`}
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
                                        + Add {group.name}
                                    </Button>
                                </div>
                                <div className="grid gap-3.5 p-4 sm:grid-cols-2 lg:grid-cols-3">
                                    {group.items.map(holding => {
                                        const pays = !holding.locked && holding.flow > 0;
                                        return (
                                            <Link
                                                key={holding.id}
                                                href={assetDetailHref(holding.id)}
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
                                                            ? 'Locked until pension'
                                                            : holding.locked
                                                              ? 'Does not pay you'
                                                              : pays
                                                                ? 'Pays you monthly'
                                                                : 'Appreciates in value'}
                                                    </span>
                                                    <Typography
                                                        as="h3"
                                                        size="lg"
                                                        className="leading-snug">
                                                        {holding.name}
                                                    </Typography>
                                                    <div className="flex justify-between font-mono text-xs">
                                                        <span className="text-fg-muted">Value</span>
                                                        <span className="text-fg-secondary">
                                                            {formatMoney(holding.value)}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between font-mono text-xs">
                                                        <span className="text-fg-muted">
                                                            Monthly income
                                                        </span>
                                                        <span
                                                            className={
                                                                pays
                                                                    ? 'text-accent'
                                                                    : 'text-fg-muted'
                                                            }>
                                                            {holding.locked
                                                                ? 'not available yet'
                                                                : pays
                                                                  ? `+ ${formatMoney(holding.flow)} p/m`
                                                                  : formatMoney(0) + ' p/m'}
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

            <Section eyebrow="Month score" title="Binnenkort">
                <EmptyState
                    icon="◇"
                    title="Nog geen data"
                    body="Maandscore, levels en log komen zodra je vermogen en schulden hier gekoppeld zijn."
                />
            </Section>
        </div>
    );
}
