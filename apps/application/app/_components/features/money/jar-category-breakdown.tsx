'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type {
    Category,
    CategoryTemplate,
    FixedCost,
    GivingOrganisation,
    MerchantPreset,
    Transaction,
} from '@rumtelo/contracts';
import { Typography } from '@rumtelo/ui';
import { cn, categoryVariance, monthlyAmount } from '@rumtelo/utils';

import { cadenceLabel } from '@/app/_lib/jar-chrome';
import {
    claimFixedCostMatches,
    fixedCostStatus,
    type FixedCostStatus,
} from '@/app/_lib/fixed-cost-match';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { fixedDetailHref, txDetailHref } from '@/app/_lib/create-routes';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { findPartyVendor, partyMark } from '@/app/_lib/vendor-brands';
import { MetaChip, formatBookedDate, formatDueDay } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';

type CategoryRow = Pick<Category, 'id' | 'name' | 'budgeted' | 'actual'>;

function statusChip(status: FixedCostStatus) {
    if (status === 'taken') {
        return <MetaChip className="border-success/30 text-success">Taken</MetaChip>;
    }
    if (status === 'due') {
        return <MetaChip className="border-danger/30 text-danger">Still due</MetaChip>;
    }
    return <MetaChip>Planned</MetaChip>;
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
    period: { year: number; month: number };
    jarKey: string;
    jarIcon?: string | null;
    jarByKey?: Map<string, { icon: string | null }>;
    categoryTemplates: readonly Pick<CategoryTemplate, 'name' | 'icon'>[];
    merchants: readonly MerchantPreset[];
    givingOrgs: readonly Pick<GivingOrganisation, 'name' | 'website'>[];
    allowFixedCosts: boolean;
}) {
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
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

    function bucketTotals(bucketId: string) {
        const bucketFixed = allowFixedCosts ? (fixedByCategory.get(bucketId) ?? []) : [];
        const bucketTxs = txByCategory.get(bucketId) ?? [];
        const budgeted = bucketFixed.reduce(
            (sum, item) => sum + monthlyAmount(Math.abs(item.amount), item.cadence),
            0
        );
        // Match jar category "actual": period OUT only (inflows nest under the row but don't count as spent).
        const actual = bucketTxs.reduce(
            (sum, tx) => (tx.amount < 0 ? sum + Math.abs(tx.amount) : sum),
            0
        );
        return { budgeted, actual };
    }

    for (const [key, items] of fixedByCategory) {
        if (key === uncategorizedKey || knownIds.has(key)) continue;
        if (items.length === 0) continue;
        const totals = bucketTotals(key);
        rows.push({
            id: key,
            name: 'Other',
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
            name: 'Uncategorized',
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

    const { claimedTxIds, matchByFixedCostId: fixedMatchById } = allowFixedCosts
        ? claimFixedCostMatches(fixedCosts, transactions)
        : { claimedTxIds: new Set<string>(), matchByFixedCostId: new Map<string, Transaction>() };

    function toggle(id: string) {
        setOpenIds(previous => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }

    if (rows.length === 0) {
        return (
            <Typography as="p" size="sm" color="muted" className="px-5 py-4">
                No categories yet.
            </Typography>
        );
    }

    return (
        <ul className="grid">
            {rows.map(category => {
                const open = openIds.has(category.id);
                const { diff, over } = categoryVariance(category.budgeted, category.actual);
                const icon = category.synthetic
                    ? '◇'
                    : categoryIcon(category.name, categoryTemplates, jarIcon);
                const categoryFixed = allowFixedCosts
                    ? (fixedByCategory.get(category.id) ?? [])
                    : [];
                const categoryTxs = txByCategory.get(category.id) ?? [];

                const fixedRows = categoryFixed.map(item => {
                    const monthly = monthlyAmount(item.amount, item.cadence);
                    const match = fixedMatchById.get(item.id);
                    return {
                        item,
                        monthly,
                        match,
                        status: fixedCostStatus(item, match, period, today),
                    };
                });

                const leftoverTxs = categoryTxs.filter(tx => !claimedTxIds.has(tx.id));
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
                                        Planned {formatMoney(category.budgeted)} · Spent{' '}
                                        {formatMoney(category.actual)}
                                    </span>
                                </span>
                                <span className="hidden min-w-0 flex-1 items-center justify-end gap-6 sm:flex">
                                    <span className="w-20 text-right font-mono text-sm text-fg-muted tabular-nums">
                                        {formatMoney(category.budgeted)}
                                    </span>
                                    <span className="w-20 text-right font-mono text-sm text-fg tabular-nums">
                                        {formatMoney(category.actual)}
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
                                {formatMoney(diff, { signed: true })} over / under
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
                                        Nothing booked in this category yet.
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
                                            const due = formatDueDay(item.dueDay);
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
                                                                {statusChip(status)}
                                                                {due ? (
                                                                    <MetaChip>{due}</MetaChip>
                                                                ) : null}
                                                                <MetaChip>
                                                                    {cadenceLabel(item.cadence)}
                                                                </MetaChip>
                                                                {match ? (
                                                                    <MetaChip>
                                                                        {formatBookedDate(
                                                                            match.bookedOn
                                                                        )}
                                                                    </MetaChip>
                                                                ) : null}
                                                                {Math.abs(monthly) !==
                                                                Math.abs(item.amount) ? (
                                                                    <MetaChip>
                                                                        {formatMoney(monthly)}/mo
                                                                    </MetaChip>
                                                                ) : null}
                                                            </>
                                                        }
                                                        onClick={() =>
                                                            router.push(fixedDetailHref(item.id))
                                                        }
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
                                                                    Taken
                                                                </MetaChip>
                                                                <MetaChip>
                                                                    {formatBookedDate(tx.bookedOn)}
                                                                </MetaChip>
                                                            </>
                                                        }
                                                        onClick={() =>
                                                            router.push(txDetailHref(tx.id))
                                                        }
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
