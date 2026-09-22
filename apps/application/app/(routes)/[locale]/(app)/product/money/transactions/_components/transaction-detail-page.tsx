'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import Link from 'next/link';
import type { ReactNode } from 'react';

import type { Transaction } from '@rumtelo/contracts';
import { TransactionSource, TransactionStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Card, Typography, VendorMark } from '@rumtelo/ui';
import { isFixedCostCounting, toPeriodKey } from '@rumtelo/utils';

import {
    debtDetailHref,
    fixedDetailHref,
    txDetailHref,
    updateHref,
} from '@/app/_lib/create-routes';
import { bgClassToCssVar } from '@/app/_lib/jar-chrome';
import { suggestFixedCostForTx } from '@/app/_lib/fixed-cost-match';
import { resolveJarSubtitle } from '@/app/_lib/jar-copy';
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
import { EditIcon } from '@/components/features/ui/action-icons';

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

function partyDisplayName(row: Transaction, fallback: string) {
    return row.counterparty?.trim() || row.description.trim() || fallback;
}

function sourceLabel(
    source: TransactionSource,
    t: ReturnType<typeof useTranslations<'features.money.transactions.detail'>>
) {
    switch (source) {
        case TransactionSource.MANUAL:
            return t('source_manual');
        case TransactionSource.CSV:
            return t('source_csv');
        case TransactionSource.BANK:
            return t('source_bank');
        case TransactionSource.RECURRING:
            return t('source_recurring');
        default:
            return String(source);
    }
}

function statusLabel(
    status: TransactionStatus,
    t: ReturnType<typeof useTranslations<'features.money.transactions.detail'>>
) {
    switch (status) {
        case TransactionStatus.INBOX:
            return t('status_inbox');
        case TransactionStatus.SORTED:
            return t('status_sorted');
        case TransactionStatus.IGNORED:
            return t('status_ignored');
        default:
            return String(status);
    }
}

function RelatedRow({
    label,
    value,
    hint,
    href,
    leading,
    openLinkLabel,
}: {
    label: string;
    value: string;
    hint?: string | null;
    href?: string;
    leading?: { icon: string; tone?: string | null };
    openLinkLabel: string;
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
            {href ? (
                <span className="shrink-0 font-mono text-xs text-accent uppercase">
                    {openLinkLabel}
                </span>
            ) : null}
        </>
    );

    if (!href) {
        return (
            <div className="flex items-center gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                {body}
            </div>
        );
    }

    return (
        <Link
            href={href}
            className="flex w-full items-center gap-3 border-b border-line px-5 py-3.5 text-left last:border-b-0 hover:bg-raised">
            {body}
        </Link>
    );
}

/**
 * Transaction detail — read first; related links into jar / bill / debt; Edit opens the form.
 */
export function TransactionDetailPageClient({ transactionId }: { transactionId: string }) {
    const tTx = useTranslations('features.money.transactions.detail');
    const tTransactions = useTranslations('features.money.transactions');
    const tJars = useTranslations('features.money.jars');
    const tAction = useTranslations('common.action');
    const { householdId } = useAuth();
    const { period } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
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
    const transactionInQuery = useLiveQuery(
        apiQuery.money.catalogs.transactionInPresets.list.queryOptions({
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
    const appliedMerchant = tx?.appliedMerchantKey
        ? merchants.find(merchant => merchant.key === tx.appliedMerchantKey)
        : undefined;

    const activeFixed = (fixedQuery.data ?? []).filter(item => isFixedCostCounting(item));
    const linkedBill = tx?.fixedCostId
        ? activeFixed.find(item => item.id === tx.fixedCostId)
        : undefined;
    const suggestedBill = !linkedBill && tx ? suggestFixedCostForTx(tx, activeFixed) : undefined;

    if (live && (listQuery.isLoading || periodQuery.isLoading || inboxQuery.isLoading) && !tx) {
        return <p className="text-sm text-fg-muted">{tTx('loading')}</p>;
    }
    if (!tx) {
        return (
            <div className="grid gap-4">
                <Link
                    href="/product/money/transactions"
                    className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                    {tTx('back')}
                </Link>
                <p className="text-sm text-fg-muted">{tTx('not_found')}</p>
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
                label={tTransactions('jar_fallback')}
                value={jar.name}
                hint={
                    resolveJarSubtitle(
                        tJars,
                        jar.key,
                        jar.subtitle,
                        jarByKey.get(jar.key)?.subtitle
                    ) || jar.key
                }
                leading={{ icon: jarIcon, tone: jarTone }}
                href={jarHref}
                openLinkLabel={tTx('open_link')}
            />
        );
    }
    if (category && jarHref) {
        related.push(
            <RelatedRow
                key="category"
                label={tTx('category')}
                value={category.name}
                hint={tTx('hint_on_jar_planned', {
                    jar: jar?.name ?? tTransactions('jar_fallback'),
                    amount: formatMoney(category.budgeted),
                })}
                leading={{ icon: categoryIcon, tone: jarTone }}
                href={jarHref}
                openLinkLabel={tTx('open_link')}
            />
        );
    }
    if (linkedBill) {
        related.push(
            <RelatedRow
                key="bill"
                label={tTx('fixed_cost')}
                value={linkedBill.counterparty?.trim() || linkedBill.name}
                hint={tTx('hint_linked_settlement')}
                href={fixedDetailHref(linkedBill.id)}
                openLinkLabel={tTx('open_link')}
            />
        );
    } else if (suggestedBill) {
        related.push(
            <RelatedRow
                key="bill-suggest"
                label={tTx('looks_like')}
                value={suggestedBill.counterparty?.trim() || suggestedBill.name}
                hint={tTx('hint_suggested_bill')}
                href={fixedDetailHref(suggestedBill.id)}
                openLinkLabel={tTx('open_link')}
            />
        );
    }
    if (tx.debtId) {
        related.push(
            <RelatedRow
                key="debt"
                label={tTx('debt_payment')}
                value={debt?.name ?? tTx('linked_debt_fallback')}
                hint={
                    debt
                        ? tTx('hint_debt_remaining', {
                              balance: formatMoney(debt.balance),
                              rate: debt.interestRate,
                          })
                        : tTx('hint_applied_debt')
                }
                href={debtDetailHref(tx.debtId)}
                openLinkLabel={tTx('open_link')}
            />
        );
    }
    if (appliedRule) {
        related.push(
            <RelatedRow
                key="rule"
                label={tTx('sorted_by_rule')}
                value={tTx('rule_to_jar', { value: appliedRule.matchValue })}
                hint={tTx('hint_manage_rules')}
                href="/product/money/transactions"
                openLinkLabel={tTx('open_link')}
            />
        );
    } else if (appliedMerchant) {
        related.push(
            <RelatedRow
                key="merchant"
                label={tTx('sorted_from_catalog')}
                value={appliedMerchant.name}
                hint={tTx('hint_catalog_sorted')}
                href="/product/money/transactions"
                openLinkLabel={tTx('open_link')}
            />
        );
    }
    if (tx.status === TransactionStatus.INBOX) {
        related.push(
            <RelatedRow
                key="inbox"
                label={tTx('needs_sorting')}
                value={tTx('inbox_still')}
                hint={tTx('inbox_assign_jar')}
                href="/product/money/transactions"
                openLinkLabel={tTx('open_link')}
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
    const historyLabel = partyDisplayName(tx, tTx('this_payee'));

    return (
        <div className="grid animate-rise gap-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                    <Link
                        href="/product/money/transactions"
                        className="w-fit font-mono text-xs font-medium tracking-wide text-fg-faint uppercase hover:text-accent">
                        {tTx('back')}
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
                                {formatBookedDate(tx.bookedOn, appLocale)} ·{' '}
                                {statusLabel(tx.status, tTx)}
                            </p>
                        </div>
                    </div>
                </div>
                <Button as={Link} href={updateHref('tx', tx.id)} variant="secondary">
                    <EditIcon />
                    {tAction('edit')}
                </Button>
            </div>

            <Card className="grid gap-4 p-5">
                <div>
                    <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                        {tTx('amount')}
                    </p>
                    <p
                        className={`mt-1 text-2xl font-semibold ${
                            tx.amount < 0 ? 'text-fg' : 'text-success'
                        }`}>
                        {formatMoney(tx.amount, { signed: true })}
                    </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <MetaChip>{formatBookedDate(tx.bookedOn, appLocale)}</MetaChip>
                    {jar && jarHref ? (
                        <Link
                            href={jarHref}
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
                        </Link>
                    ) : jar ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised py-0.5 pr-2 pl-1">
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
                        </span>
                    ) : null}
                    {category && jarHref ? (
                        <Link
                            href={jarHref}
                            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide text-fg-muted uppercase outline-none hover:border-accent-hover hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/25">
                            <span aria-hidden>{categoryIcon}</span>
                            {category.name}
                        </Link>
                    ) : category ? (
                        <MetaChip>
                            {categoryIcon} {category.name}
                        </MetaChip>
                    ) : null}
                    {tx.debtId ? (
                        <Link href={debtDetailHref(tx.debtId)}>
                            <MetaChip className="hover:border-accent-hover hover:text-accent">
                                {tTx('debt_chip')}
                            </MetaChip>
                        </Link>
                    ) : null}
                    {tx.fixedCostId ? (
                        <Link href={fixedDetailHref(tx.fixedCostId)}>
                            <MetaChip className="hover:border-accent-hover hover:text-accent">
                                {tTx('fixed_cost')}
                            </MetaChip>
                        </Link>
                    ) : null}
                    {tx.status === TransactionStatus.INBOX ? (
                        <MetaChip>{tTransactions('inbox_chip')}</MetaChip>
                    ) : null}
                </div>
            </Card>

            <Card className="grid gap-3 p-5">
                <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                    {tTx('details')}
                </p>
                <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    {tx.counterparty?.trim() ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {tTx('counterparty')}
                            </dt>
                            <dd className="mt-0.5 text-fg">{tx.counterparty}</dd>
                        </div>
                    ) : null}
                    <div>
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            {tTx('source')}
                        </dt>
                        <dd className="mt-0.5 text-fg">{sourceLabel(tx.source, tTx)}</dd>
                    </div>
                    {tx.inflowKey ? (
                        <div>
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {tTx('inflow_type')}
                            </dt>
                            <dd className="mt-0.5 text-fg">
                                {transactionInQuery.data?.find(
                                    preset => preset.key === tx.inflowKey
                                )?.name ?? tx.inflowKey}
                            </dd>
                        </div>
                    ) : null}
                    <div className="sm:col-span-2">
                        <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                            {tTx('description')}
                        </dt>
                        <dd className="mt-0.5 text-fg">{tx.description || tTx('empty_dash')}</dd>
                    </div>
                    {tx.note?.trim() ? (
                        <div className="sm:col-span-2">
                            <dt className="font-mono text-[10px] tracking-wide text-fg-faint uppercase">
                                {tTx('note')}
                            </dt>
                            <dd className="mt-0.5 text-fg-secondary">{tx.note}</dd>
                        </div>
                    ) : null}
                </dl>
            </Card>

            {related.length > 0 ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {tTx('related')}
                    </Typography>
                    <Card className="p-0">{related}</Card>
                </section>
            ) : null}

            {samePartyHistory.length > 0 ? (
                <section className="grid gap-3">
                    <Typography as="h2" variant="eyebrow" color="primary">
                        {tTx('also_from', { payee: historyLabel })}
                    </Typography>
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
                                                        {formatBookedDate(row.bookedOn, appLocale)}
                                                    </MetaChip>
                                                    {rowJar ? (
                                                        <JarBadge
                                                            jarKey={rowJar.key}
                                                            name={rowJar.name}
                                                        />
                                                    ) : null}
                                                </>
                                            }
                                            href={txDetailHref(row.id)}
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
