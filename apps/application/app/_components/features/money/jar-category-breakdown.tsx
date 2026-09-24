'use client';

import { useState } from 'react';

import type {
    Category,
    CategoryTemplate,
    FixedCost,
    FixedCostSettlement,
    GivingOrganisation,
    MerchantPreset,
    Transaction,
} from '@rumtelo/contracts';
import { FixedCostPeriodStatus } from '@rumtelo/contracts';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import { cn, categoryVariance, monthlyAmount } from '@rumtelo/utils';

import { cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    claimLinkedFixedCostTxIds,
    fixedCostStatus,
    settlementsByFixedCostId,
    type FixedCostStatus,
} from '@/app/_lib/fixed-cost-match';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { fixedDetailHref, txDetailHref } from '@/app/_lib/create-routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { MetaChip, formatBookedDate, formatDueDay } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';

type CategoryRow = Pick<Category, 'id' | 'name' | 'budgeted' | 'actual'>;

function statusChip(
    status: FixedCostStatus,
    plannedLabel: string,
    tFixed: ReturnType<typeof useTranslations<'features.money.fixed'>>
) {
    if (status === FixedCostPeriodStatus.TAKEN) {
        return (
            <MetaChip className="border-success/30 text-success">{tFixed('status_taken')}</MetaChip>
        );
    }
    if (status === FixedCostPeriodStatus.DUE) {
        return <MetaChip className="border-danger/30 text-danger">{tFixed('status_due')}</MetaChip>;
    }
    if (status === FixedCostPeriodStatus.SKIPPED) {
        return (
            <MetaChip className="border-line text-fg-muted">{tFixed('status_skipped')}</MetaChip>
        );
    }
    return <MetaChip>{plannedLabel}</MetaChip>;
}

function categoryIcon(
    name: string,
    templates: readonly Pick<CategoryTemplate, 'name' | 'icon'>[],
    jarIcon: string | null | undefined
) {
    const needle = name.trim().toLowerCase();
    const fromTemplate = templates.find(row => row.name.toLowerCase() === needle)?.icon?.trim();
    return fromTemplate || jarIcon?.trim() || '◇';
}

/**
 * Collapsible category list: planned / spent on the row, expand for fixed costs
 * and one-off transactions in that category (with taken / due / planned hints).
 */
export function JarCategoryBreakdown({
    categories,
    fixedCosts,
    transactions,
    settlements = [],
    period,
    jarKey,
    jarIcon,
    jarByKey,
    categoryTemplates,
    merchants,
    givingOrgs,
    allowFixedCosts,
}: {
    categories: readonly CategoryRow[];
    fixedCosts: readonly FixedCost[];
    transactions: readonly Transaction[];
    /** Period settlements — status source of truth when provided. */
    settlements?: readonly FixedCostSettlement[];
    period: { year: number; month: number };
    jarKey: string;
    jarIcon?: string | null;
    jarByKey?: Map<string, { icon: string | null }>;
    categoryTemplates: readonly Pick<CategoryTemplate, 'name' | 'icon'>[];
    merchants: readonly MerchantPreset[];
    givingOrgs: readonly Pick<GivingOrganisation, 'name' | 'website'>[];
    allowFixedCosts: boolean;
}) {
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const tFixed = useTranslations('features.money.fixed');
    const tJars = useTranslations('features.money.jars.detail');
    const tChips = useTranslations('features.money.chips');
    const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
    const today = new Date();

    const uncategorizedKey = 'uncategorized';
    const fixedByCategory = new Map<string, FixedCost[]>();
    for (const item of fixedCosts) {
        const key = item.categoryId ?? uncategorizedKey;
        const list = fixedByCategory.get(key) ?? [];
        list.push(item);
        fixedByCategory.set(key, list);
    }

    const txByCategory = new Map<string, Transaction[]>();
    for (const tx of transactions) {
        const key = tx.categoryId ?? uncategorizedKey;
        const list = txByCategory.get(key) ?? [];
        list.push(tx);
        txByCategory.set(key, list);
    }

    const rows: Array<CategoryRow & { synthetic?: boolean }> = [...categories];
    const knownIds = new Set(categories.map(row => row.id));

    function txMovement(txs: readonly Transaction[]) {
        let spent = 0;
        let received = 0;
        for (const tx of txs) {
            if (tx.amount < 0) spent += Math.abs(tx.amount);
            else if (tx.amount > 0) received += tx.amount;
        }
        // Prefer OUT (spent). Income-only buckets (e.g. uncategorized Studio draw)
        // still need a non-zero parent total.
        return spent > 0 ? spent : received;
    }

    function bucketTotals(bucketId: string) {
        const bucketFixed = allowFixedCosts ? (fixedByCategory.get(bucketId) ?? []) : [];
        const bucketTxs = txByCategory.get(bucketId) ?? [];
        const budgeted = bucketFixed.reduce(
            (sum, item) => sum + monthlyAmount(Math.abs(item.amount), item.cadence),
            0
        );
        return { budgeted, actual: txMovement(bucketTxs) };
    }

    for (const [key, items] of fixedByCategory) {
        if (key === uncategorizedKey || knownIds.has(key)) continue;
        if (items.length === 0) continue;
        const totals = bucketTotals(key);
        rows.push({
            id: key,
            name: tJars('bucket_other'),
            budgeted: totals.budgeted,
            actual: totals.actual,
            synthetic: true,
        });
        knownIds.add(key);
    }

    const hasUncategorized =
        (fixedByCategory.get(uncategorizedKey)?.length ?? 0) > 0 ||
        (txByCategory.get(uncategorizedKey)?.length ?? 0) > 0;
    if (hasUncategorized) {
        const totals = bucketTotals(uncategorizedKey);
        rows.push({
            id: uncategorizedKey,
            name: tJars('bucket_uncategorized'),
            budgeted: totals.budgeted,
            actual: totals.actual,
            synthetic: true,
        });
    }

    rows.sort(
        (left, right) =>
            right.budgeted - left.budgeted ||
            right.actual - left.actual ||
            left.name.localeCompare(right.name)
    );

    // Hide empty template copies — only rows with planned/spent money or linked activity.
    const visibleRows = rows.filter(row => {
        if (row.budgeted !== 0 || row.actual !== 0) return true;
        const hasFixed = allowFixedCosts && (fixedByCategory.get(row.id)?.length ?? 0) > 0;
        const hasTx = (txByCategory.get(row.id)?.length ?? 0) > 0;
        return hasFixed || hasTx;
    });

    const settlementById = settlementsByFixedCostId(settlements);
    const claimedTxIds = allowFixedCosts
        ? claimLinkedFixedCostTxIds(transactions, settlements)
        : new Set<string>();
    const txById = new Map(transactions.map(tx => [tx.id, tx]));

    function toggle(id: string) {
        setOpenIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    if (visibleRows.length === 0) {
        return (
            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                {tJars('no_categories')}
            </Typography>
        );
    }

    return (
        <ul className="grid">
            {visibleRows.map(category => {
                const open = openIds.has(category.id);
                const categoryFixed = allowFixedCosts
                    ? (fixedByCategory.get(category.id) ?? [])
                    : [];
                const categoryTxs = txByCategory.get(category.id) ?? [];
                const icon = category.synthetic
                    ? '◇'
                    : categoryIcon(category.name, categoryTemplates, jarIcon);

                const fixedRows = categoryFixed.map(item => {
                    const monthly = monthlyAmount(item.amount, item.cadence);
                    const settlement = settlementById.get(item.id);
                    const match = settlement?.transactionId
                        ? txById.get(settlement.transactionId)
                        : undefined;
                    return {
                        item,
                        monthly,
                        match,
                        status: fixedCostStatus(item, settlement, period, today),
                    };
                });

                const leftoverTxs = categoryTxs.filter(tx => !claimedTxIds.has(tx.id));
                // Roll up from nested activity so income-only rows (Studio BV etc.)
                // aren't stuck at €0 when API "actual" is OUT-only.
                const liveActual = txMovement(leftoverTxs);
                const actual = liveActual > 0 ? liveActual : category.actual;
                const budgeted = category.budgeted;
                const onlyInflows =
                    leftoverTxs.length > 0 &&
                    leftoverTxs.every(tx => tx.amount >= 0) &&
                    categoryFixed.length === 0;
                const { diff, over } =
                    onlyInflows && budgeted === 0
                        ? { diff: actual, over: false }
                        : categoryVariance(budgeted, actual);
                const childCount = fixedRows.length + leftoverTxs.length;
                const canExpand = childCount > 0;

                return (
                    <li key={category.id} className="border-b border-line last:border-b-0">
                        <button
                            type="button"
                            onClick={() => canExpand && toggle(category.id)}
                            aria-expanded={open}
                            disabled={!canExpand}
                            className={cn(
                                'grid w-full gap-2 px-4 py-3 text-left transition-colors outline-none sm:px-5',
                                canExpand &&
                                    'hover:bg-raised focus-visible:ring-2 focus-visible:ring-accent/25',
                                !canExpand && 'cursor-default'
                            )}>
                            <span className="flex items-center gap-3">
                                <span className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-base">
                                    {icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="block truncate text-sm font-medium text-fg">
                                        {category.name}
                                    </span>
                                    <span className="mt-0.5 block font-mono text-[11px] text-fg-faint sm:hidden">
                                        {tFixed('status_planned')} {formatMoney(budgeted)} ·{' '}
                                        {tJars('mobile_spent', {
                                            amount: formatMoney(actual),
                                        })}
                                    </span>
                                </span>
                                <span className="hidden min-w-0 flex-1 items-center justify-end gap-6 sm:flex">
                                    <span className="w-20 text-right font-mono text-sm text-fg-muted tabular-nums">
                                        {formatMoney(budgeted)}
                                    </span>
                                    <span className="w-20 text-right font-mono text-sm text-fg tabular-nums">
                                        {formatMoney(actual)}
                                    </span>
                                    <span
                                        className={cn(
                                            'w-24 text-right font-mono text-sm tabular-nums',
                                            over ? 'text-danger' : 'text-success'
                                        )}>
                                        {formatMoney(diff, { signed: true })}
                                    </span>
                                </span>
                                <span
                                    className={cn(
                                        'shrink-0 text-xs text-fg-faint transition-transform duration-200',
                                        open && 'rotate-180',
                                        !canExpand && 'opacity-0'
                                    )}>
                                    ▾
                                </span>
                            </span>
                            <span
                                className={cn(
                                    'font-mono text-xs tabular-nums sm:hidden',
                                    over ? 'text-danger' : 'text-success'
                                )}>
                                {tJars('mobile_over_under', {
                                    amount: formatMoney(diff, { signed: true }),
                                })}
                            </span>
                        </button>

                        {open ? (
                            <div className="animate-rise border-t border-line bg-raised/40">
                                {childCount === 0 ? (
                                    <Typography
                                        as="p"
                                        size="sm"
                                        color="muted"
                                        className="px-5 py-3">
                                        {tJars('nothing_booked')}
                                    </Typography>
                                ) : (
                                    <ul className="grid">
                                        {fixedRows.map(({ item, monthly, match, status }) => {
                                            const company = item.counterparty?.trim() || item.name;
                                            const subtitle =
                                                item.counterparty?.trim() &&
                                                item.counterparty.trim() !== item.name.trim()
                                                    ? item.name
                                                    : null;
                                            const due = formatDueDay(item.dueDay, tChips);
                                            return (
                                                <li key={`fc-${item.id}`}>
                                                    <MoneyPartyRow
                                                        title={company}
                                                        subtitle={subtitle}
                                                        mark={partyMark(
                                                            findPartyVendor(
                                                                company,
                                                                merchants,
                                                                givingOrgs
                                                            ),
                                                            catalogMarkChrome({
                                                                billName: item.name,
                                                                jarKey,
                                                                jarByKey,
                                                                categoryTemplates,
                                                            })
                                                        )}
                                                        amount={formatMoney(-Math.abs(monthly))}
                                                        badges={
                                                            <>
                                                                {statusChip(
                                                                    status,
                                                                    tFixed('status_planned'),
                                                                    tFixed
                                                                )}
                                                                {due ? (
                                                                    <MetaChip>{due}</MetaChip>
                                                                ) : null}
                                                                <MetaChip>
                                                                    {cadenceLabel(
                                                                        item.cadence,
                                                                        tChips
                                                                    )}
                                                                </MetaChip>
                                                                {match ? (
                                                                    <MetaChip>
                                                                        {formatBookedDate(
                                                                            match.bookedOn,
                                                                            appLocale
                                                                        )}
                                                                    </MetaChip>
                                                                ) : null}
                                                                {Math.abs(monthly) !==
                                                                Math.abs(item.amount) ? (
                                                                    <MetaChip>
                                                                        {tChips(
                                                                            'amount_per_month',
                                                                            {
                                                                                amount: formatMoney(
                                                                                    monthly
                                                                                ),
                                                                            }
                                                                        )}
                                                                    </MetaChip>
                                                                ) : null}
                                                            </>
                                                        }
                                                        href={fixedDetailHref(item.id)}
                                                    />
                                                </li>
                                            );
                                        })}
                                        {leftoverTxs.map(tx => {
                                            const title = tx.counterparty?.trim() || tx.description;
                                            const subtitle =
                                                tx.counterparty?.trim() &&
                                                tx.description &&
                                                tx.description !== tx.counterparty.trim()
                                                    ? tx.description
                                                    : null;
                                            return (
                                                <li key={`tx-${tx.id}`}>
                                                    <MoneyPartyRow
                                                        title={title}
                                                        subtitle={subtitle}
                                                        mark={partyMark(
                                                            findPartyVendor(
                                                                title,
                                                                merchants,
                                                                givingOrgs
                                                            ),
                                                            catalogMarkChrome({
                                                                jarKey,
                                                                jarByKey,
                                                                categoryTemplates,
                                                            })
                                                        )}
                                                        amount={formatMoney(tx.amount)}
                                                        amountClassName={
                                                            tx.amount < 0
                                                                ? 'text-fg'
                                                                : 'text-success'
                                                        }
                                                        badges={
                                                            <>
                                                                <MetaChip className="border-success/30 text-success">
                                                                    {tFixed('status_taken')}
                                                                </MetaChip>
                                                                <MetaChip>
                                                                    {formatBookedDate(
                                                                        tx.bookedOn,
                                                                        appLocale
                                                                    )}
                                                                </MetaChip>
                                                            </>
                                                        }
                                                        href={txDetailHref(tx.id)}
                                                    />
                                                </li>
                                            );
                                        })}
                                    </ul>
                                )}
                            </div>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}
