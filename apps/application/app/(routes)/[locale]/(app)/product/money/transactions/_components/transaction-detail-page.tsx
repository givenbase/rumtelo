'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

import type { Transaction } from '@rumtelo/contracts';
import { FlowDirection, TransactionSource, TransactionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, VendorMark } from '@rumtelo/ui';
import { toPeriodKey } from '@rumtelo/utils';

import {
    debtDetailHref,
    fixedDetailHref,
    txDetailHref,
    updateHref,
} from '@/app/_lib/create-routes';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { claimFixedCostMatches } from '@/app/_lib/fixed-cost-match';
import { jarKeyToSlug } from '@/app/_lib/jar-slug';
import { jarChrome } from '@/app/_lib/jar-meta';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { findCatalogVendorFromFeed, partyMark } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { JarBadge, MetaChip, formatBookedDate } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_PAGE = { items: EMPTY_TRANSACTIONS, nextCursor: null };
const SAME_PARTY_HISTORY_LIMIT = 5;

function normalizeParty(value: string | null | undefined) {
    return value?.trim().toLowerCase() ?? '';
}

/** Stable key so “Vanguard” / catalog merchant / same description group together. */
function samePartyKey(
    row: Transaction,
    merchants: Parameters<typeof findCatalogVendorFromFeed>[1]
) {
    const counterparty = normalizeParty(row.counterparty);
    if (counterparty) return `c:${counterparty}`;

    const title = row.counterparty?.trim() || row.description;
    const vendor = findCatalogVendorFromFeed(title, merchants);
    if (vendor?.key) return `k:${vendor.key}`;

    const description = normalizeParty(row.description);
    return description ? `d:${description}` : '';
}

function partyDisplayName(row: Transaction) {
    return row.counterparty?.trim() || row.description.trim() || 'this payee';
}

function sourceLabel(source: TransactionSource) {
    switch (source) {
        case TransactionSource.MANUAL:
            return 'Entered manually';
        case TransactionSource.CSV:
            return 'CSV import';
        case TransactionSource.BANK:
            return 'Bank feed';
        case TransactionSource.RECURRING:
            return 'From a recurring plan';
        default:
            return String(source);
    }
}

function statusLabel(status: TransactionStatus) {
    switch (status) {
        case TransactionStatus.INBOX:
            return 'Waiting in inbox';
        case TransactionStatus.SORTED:
            return 'Sorted into a jar';
        case TransactionStatus.IGNORED:
            return 'Ignored (not in budget maths)';
        default:
            return String(status);
    }
}

function RelatedRow({
    label,
    value,
    hint,
    onClick,
    leading,
}: {
    label: string;
    value: string;
    hint?: string | null;
    onClick?: () => void;
    leading?: { icon: string; tone?: string | null };
}) {
    const body = (
        <>
            {leading ? (
                <span
                    className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-raised text-base"
                    style={
                        leading.tone
                            ? { background: leading.tone, borderColor: 'transparent' }
                            : undefined
                    }
                    aria-hidden>
                    {leading.icon}
                </span>
            ) : null}
            <span className="min-w-0 flex-1">
                <span className="block font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                    {label}
                </span>
                <span className="mt-0.5 block truncate text-sm text-fg">{value}</span>
                {hint ? (
                    <span className="mt-0.5 block font-mono text-[11px] text-fg-faint">{hint}</span>
                ) : null}
            </span>
            {onClick ? (
                <span className="shrink-0 font-mono text-xs text-accent uppercase">Open ›</span>
            ) : null}
        </>
    );

    if (!onClick) {
        return (
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                {body}
            </div>
        );
    }

    return (
        <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center gap-3 border-b border-line px-5 py-3.5 text-left last:border-b-0 hover:bg-raised">
            {body}
        </button>
    );
}

/**
 * Transaction detail — read first; related links into jar / bill / debt; Edit opens the form.
 */
export function TransactionDetailPageClient({ transactionId }: { transactionId: string }) {
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    const { byKey: jarByKey } = useJarCatalog();
    const categoryTemplatesQuery = useCategoryTemplates(live);

    const listQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, limit: 200 },
        }),
        EMPTY_PAGE,
        live
    );
    const periodQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, period: periodKey, limit: 200 },
        }),
        EMPTY_PAGE,
        live
    );
    const inboxQuery = useLiveQuery(
        apiQuery.money.transactions.inbox.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_TRANSACTIONS,
        live
    );
    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.balances.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );
    const fixedQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const debtsQuery = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const rulesQuery = useLiveQuery(
        apiQuery.money.rules.list.queryOptions({ input: { householdId: householdId! } }),
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

    const fromList = listQuery.data?.items?.find(row => row.id === transactionId);
    const fromPeriod = periodQuery.data?.items?.find(row => row.id === transactionId);
    const fromInbox = (inboxQuery.data ?? []).find(row => row.id === transactionId);
    const tx = fromList ?? fromPeriod ?? fromInbox;

    const jars = jarsQuery.data ?? [];
    const jar = tx?.jarId ? jars.find(row => row.id === tx.jarId) : undefined;
    const category =
        tx?.categoryId && jar ? jar.categories?.find(row => row.id === tx.categoryId) : undefined;
    const merchants = merchantsQuery.data ?? [];
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const debts = debtsQuery.data ?? [];
    const debt = tx?.debtId ? debts.find(row => row.id === tx.debtId) : undefined;
    const rules = rulesQuery.data ?? [];
    const appliedRule = tx?.appliedRuleId
        ? rules.find(row => row.id === tx.appliedRuleId)
        : undefined;

    const activeFixedOut = (fixedQuery.data ?? []).filter(
        item => item.isActive && item.direction === FlowDirection.OUT
    );
    const matchedFixed =
        tx && tx.amount < 0
            ? [...claimFixedCostMatches(activeFixedOut, [tx]).matchByFixedCostId.entries()].find(
                  ([, matched]) => matched.id === tx.id
              )?.[0]
            : undefined;
    const linkedBill = matchedFixed
        ? activeFixedOut.find(item => item.id === matchedFixed)
        : undefined;

    if (live && (listQuery.isLoading || periodQuery.isLoading || inboxQuery.isLoading) && !tx) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!tx) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/money/transactions"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    ← Transactions
                </Link>
                <p className="text-sm text-fg-muted">Transaction not found.</p>
            </div>
        );
    }

    const title = tx.counterparty?.trim() || tx.description;
    const mark = partyMark(
        findCatalogVendorFromFeed(title, merchants) ?? { name: title },
        catalogMarkChrome({
            billName: tx.description,
            jarKey: jar?.key,
            jarByKey,
            categoryTemplates,
        })
    );
    const jarHref = jar?.key ? `/product/money/jars/${jarKeyToSlug(jar.key)}` : null;
    const jarIcon =
        jar?.icon?.trim() || (jar?.key ? jarByKey.get(jar.key)?.icon?.trim() : null) || '◇';
    const jarTone = jar?.key ? bgClassToCssVar(jarChrome(jar.key).color) : null;
    const categoryIcon =
        categoryTemplates
            .find(row => row.name.toLowerCase() === (category?.name ?? '').toLowerCase())
            ?.icon?.trim() || jarIcon;

    const related: ReactNode[] = [];
    if (jar && jarHref) {
        related.push(
            <RelatedRow
                key="jar"
                label="Jar"
                value={jar.name}
                hint={jar.subtitle ?? jar.key}
                leading={{ icon: jarIcon, tone: jarTone }}
                onClick={() => router.push(jarHref)}
            />
        );
    }
    if (category && jarHref) {
        related.push(
            <RelatedRow
                key="category"
                label="Category"
                value={category.name}
                hint={`On ${jar?.name ?? 'jar'} · planned ${formatMoney(category.budgeted)}`}
                leading={{ icon: categoryIcon, tone: jarTone }}
                onClick={() => router.push(jarHref)}
            />
        );
    }
    if (linkedBill) {
        related.push(
            <RelatedRow
                key="bill"
                label="Recurring bill"
                value={linkedBill.counterparty?.trim() || linkedBill.name}
                hint="Looks like this period’s payment for that bill"
                onClick={() => router.push(fixedDetailHref(linkedBill.id))}
            />
        );
    }
    if (tx.debtId) {
        related.push(
            <RelatedRow
                key="debt"
                label="Debt payment"
                value={debt?.name ?? 'Linked debt'}
                hint={
                    debt
                        ? `${formatMoney(debt.balance)} left · ${debt.interestRate}% APR`
                        : 'Applied to a debt balance'
                }
                onClick={() => router.push(debtDetailHref(tx.debtId!))}
            />
        );
    }
    if (appliedRule) {
        related.push(
            <RelatedRow
                key="rule"
                label="Sorted by rule"
                value={`“${appliedRule.value}” → jar`}
                hint="Manage rules on the Transactions page"
                onClick={() => router.push('/product/money/transactions')}
            />
        );
    }
    if (tx.status === TransactionStatus.INBOX) {
        related.push(
            <RelatedRow
                key="inbox"
                label="Needs sorting"
                value="Still in the inbox"
                hint="Assign a jar to include it in the budget"
                onClick={() => router.push('/product/money/transactions')}
            />
        );
    }

    const partyKey = samePartyKey(tx, merchants);
    const samePartyHistory = partyKey
        ? (listQuery.data?.items ?? [])
              .filter(row => row.id !== tx.id && samePartyKey(row, merchants) === partyKey)
              .slice()
              .sort((left, right) => right.bookedOn.localeCompare(left.bookedOn))
              .slice(0, SAME_PARTY_HISTORY_LIMIT)
        : [];
    const historyLabel = partyDisplayName(tx);

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href="/product/money/transactions"
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        ← Transactions
                    </Link>
                    <div className="flex items-center gap-3">
                        <VendorMark
                            name={mark.name}
                            src={mark.src}
                            fallbackIcon={mark.fallbackIcon}
                            tone={mark.tone}
                            size={40}
                        />
                        <div>
                            <h1 className="text-2xl font-semibold tracking-tight text-fg">
                                {title}
                            </h1>
                            <p className="mt-0.5 font-mono text-xs text-fg-muted">
                                {formatBookedDate(tx.bookedOn)} · {statusLabel(tx.status)}
                            </p>
                        </div>
                    </div>
                </div>
                <Button
                    type="button"
                    variant="secondary"
                    onClick={() => router.push(updateHref('tx', tx.id))}>
                    Edit
                </Button>
            </div>

            <Card className="grid gap-4 p-5">
                <div>
                    <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                        Amount
                    </p>
                    <p
                        className={`mt-1 text-2xl font-semibold ${
                            tx.amount < 0 ? 'text-fg' : 'text-success'
                        }`}>
                        {formatMoney(tx.amount, { signed: true })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <MetaChip>{formatBookedDate(tx.bookedOn)}</MetaChip>
                    {jar ? (
                        <button
                            type="button"
                            onClick={() => jarHref && router.push(jarHref)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1 outline-none hover:border-accent-hover focus-visible:ring-2 focus-visible:ring-accent/25">
                            <span
                                className="grid size-5 place-items-center rounded-md text-[11px]"
                                style={
                                    jarTone
                                        ? { background: jarTone }
                                        : { background: 'var(--color-raised)' }
                                }
                                aria-hidden>
                                {jarIcon}
                            </span>
                            <JarBadge
                                jarKey={jar.key}
                                name={jar.name}
                                className="border-0 bg-transparent p-0"
                            />
                        </button>
                    ) : null}
                    {category && jarHref ? (
                        <button
                            type="button"
                            onClick={() => router.push(jarHref)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-fg-muted uppercase outline-none hover:border-accent-hover hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/25">
                            <span aria-hidden>{categoryIcon}</span>
                            {category.name}
                        </button>
                    ) : category ? (
                        <MetaChip>
                            {categoryIcon} {category.name}
                        </MetaChip>
                    ) : null}
                    {tx.debtId ? (
                        <button
                            type="button"
                            onClick={() => router.push(debtDetailHref(tx.debtId!))}>
                            <MetaChip className="hover:border-accent-hover hover:text-accent">
                                Debt
                            </MetaChip>
                        </button>
                    ) : null}
                    {tx.status === TransactionStatus.INBOX ? <MetaChip>Inbox</MetaChip> : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    Details
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {tx.counterparty?.trim() ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Counterparty
                            </dt>
                            <dd className="mt-0.5 text-fg">{tx.counterparty}</dd>
                        </div>
                    ) : null}
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Source
                        </dt>
                        <dd className="mt-0.5 text-fg">{sourceLabel(tx.source)}</dd>
                    </div>
                    {tx.inflowKey ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Inflow type
                            </dt>
                            <dd className="mt-0.5 text-fg">{tx.inflowKey.replaceAll('_', ' ')}</dd>
                        </div>
                    ) : null}
                    <div className="sm:col-span-2">
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            Description
                        </dt>
                        <dd className="mt-0.5 text-fg">{tx.description || '—'}</dd>
                    </div>
                    {tx.note?.trim() ? (
                        <div className="sm:col-span-2">
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                Note
                            </dt>
                            <dd className="mt-0.5 text-fg-secondary">{tx.note}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>

            {related.length > 0 ? (
                <section className="grid gap-3">
                    <h2 className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        ✦ Related
                    </h2>
                    <Card className="p-0">{related}</Card>
                </section>
            ) : null}

            {samePartyHistory.length > 0 ? (
                <section className="grid gap-3">
                    <h2 className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                        ✦ Also from {historyLabel}
                    </h2>
                    <Card className="p-0">
                        <ul className="grid">
                            {samePartyHistory.map(row => {
                                const rowTitle = row.counterparty?.trim() || row.description;
                                const rowSubtitle =
                                    row.counterparty?.trim() &&
                                    row.description &&
                                    row.description !== row.counterparty.trim()
                                        ? row.description
                                        : null;
                                const rowJar = row.jarId
                                    ? jars.find(entry => entry.id === row.jarId)
                                    : undefined;
                                return (
                                    <li key={row.id}>
                                        <MoneyPartyRow
                                            title={rowTitle}
                                            subtitle={rowSubtitle}
                                            mark={partyMark(
                                                findCatalogVendorFromFeed(rowTitle, merchants) ?? {
                                                    name: rowTitle,
                                                },
                                                catalogMarkChrome({
                                                    billName: row.description,
                                                    jarKey: rowJar?.key,
                                                    jarByKey,
                                                    categoryTemplates,
                                                })
                                            )}
                                            amount={formatMoney(row.amount, { signed: true })}
                                            amountClassName={
                                                row.amount < 0 ? 'text-fg' : 'text-success'
                                            }
                                            badges={
                                                <>
                                                    <MetaChip>
                                                        {formatBookedDate(row.bookedOn)}
                                                    </MetaChip>
                                                    {rowJar ? (
                                                        <JarBadge
                                                            jarKey={rowJar.key}
                                                            name={rowJar.name}
                                                        />
                                                    ) : null}
                                                </>
                                            }
                                            onClick={() => router.push(txDetailHref(row.id))}
                                        />
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                </section>
            ) : null}
        </div>
    );
}
