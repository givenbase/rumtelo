'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDeferredValue, useMemo, useState } from 'react';

import { useLiveQuery } from '@rumtelo/hooks';
import { useLocale, useTranslations } from '@rumtelo/i18n';
import { Button, Card, EmptyState, Slider, Typography } from '@rumtelo/ui';
import { cn, toPeriodKey } from '@rumtelo/utils';

import {
    JarKey,
    RuleField,
    RuleMatcher,
    TransactionStatus,
    jarCapabilitiesFor,
    type Debt,
    type FixedCost,
    type Jar,
    type MerchantPreset,
    type Rule,
    type Transaction,
} from '@rumtelo/contracts';

import { useApiError } from '@/app/_lib/api-error-messages';
import { CREATE_HREF, createTxHref, txDetailHref } from '@/app/_lib/create-routes';
import { suggestFixedCostForTx } from '@/app/_lib/fixed-cost-match';
import { buildPayeeJarMemory, suggestInboxJar } from '@/app/_lib/inbox-suggest';
import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { isLiveData } from '@/app/_lib/preview';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { partyMark, findCatalogMerchantFromFeed } from '@/app/_lib/vendor-brands';
import { useCategoryTemplates } from '@/components/features/forms/catalog-helpers';
import { InboxSortCard } from '@/components/features/money/inbox-sort-card';
import { JarBadge, MetaChip, formatBookedDate } from '@/components/features/money/jar-badge';
import { MoneyPartyRow } from '@/components/features/money/money-party-row';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { useAuth } from '@/components/features/shell/auth-provider';
import { ListControls, ListControlsChip } from '@/components/layout/list-controls';
import { ListToolbar } from '@/components/layout/list-toolbar';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';
import { useBankSyncOnVisit } from '@/app/_lib/use-bank-sync-on-visit';
import Link from 'next/link';

type Tab = 'INBOX' | 'OUT' | 'IN' | 'RULES';
type LedgerSort = 'date-new' | 'date-old' | 'amount-high' | 'amount-low';

/** Dual-thumb amount range in minor units — €25 steps up to €500. */
const AMOUNT_STEP = 2_500;
const AMOUNT_MAX = 50_000;
const AMOUNT_RANGE_DEFAULT: [number, number] = [0, AMOUNT_MAX];

function matchesAmountRange(absAmount: number, range: readonly [number, number]): boolean {
    const [min, max] = range;
    if (min === 0 && max === AMOUNT_MAX) return true;
    if (max >= AMOUNT_MAX) return absAmount >= min;
    return absAmount >= min && absAmount <= max;
}

function isLedgerSort(value: string): value is LedgerSort {
    return (
        value === 'date-new' ||
        value === 'date-old' ||
        value === 'amount-high' ||
        value === 'amount-low'
    );
}

function sortLedger(items: Transaction[], sort: LedgerSort): Transaction[] {
    const next = items.slice();
    next.sort((left, right) => {
        if (sort === 'date-old') return left.bookedOn.localeCompare(right.bookedOn);
        if (sort === 'amount-high') return Math.abs(right.amount) - Math.abs(left.amount);
        if (sort === 'amount-low') return Math.abs(left.amount) - Math.abs(right.amount);
        return right.bookedOn.localeCompare(left.bookedOn);
    });
    return next;
}

const MATCHER_KEY: Record<RuleMatcher, string> = {
    [RuleMatcher.CONTAINS]: 'matcher_contains',
    [RuleMatcher.EQUALS]: 'matcher_equals',
    [RuleMatcher.STARTS_WITH]: 'matcher_starts_with',
    [RuleMatcher.REGEX]: 'matcher_regex',
};

const FIELD_KEY: Record<RuleField, string> = {
    [RuleField.DESCRIPTION]: 'field_description',
    [RuleField.COUNTERPARTY]: 'field_counterparty',
    [RuleField.AMOUNT]: 'field_amount',
};

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_JARS: Jar[] = [];
const EMPTY_DEBTS: Debt[] = [];
const EMPTY_FIXED: FixedCost[] = [];
const EMPTY_RULES: Rule[] = [];
const EMPTY_MERCHANTS: MerchantPreset[] = [];
const EMPTY_TRANSACTION_PAGE = { items: EMPTY_TRANSACTIONS, nextCursor: null };

/** Soft “Juist” payee memory uses priority 900 on the backend — hide those from Rules UI. */
const EXPLICIT_RULE_PRIORITY_MAX = 500;

export function TransactionsPageClient() {
    const t = useTranslations('features.money.transactions');
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast, period } = useAppShell();
    const apiError = useApiError();
    const { formatMoney } = useHouseholdCurrency();
    const appLocale = useLocale();
    const [tab, setTab] = useState<Tab>('INBOX');
    const [ledgerLayout, setLedgerLayout] = useState<'list' | 'jar'>('list');
    const [openJarIds, setOpenJarIds] = useState<Set<string>>(() => new Set());
    const [search, setSearch] = useState('');
    const [jarFilter, setJarFilter] = useState('all');
    const [amountRange, setAmountRange] = useState<[number, number]>(AMOUNT_RANGE_DEFAULT);
    const [ledgerSort, setLedgerSort] = useState<LedgerSort>('date-new');
    const deferredSearch = useDeferredValue(search.trim());
    const live = isLiveData(householdId);
    const periodKey = toPeriodKey(period.year, period.month);
    useBankSyncOnVisit();

    const inboxQuery = useLiveQuery(
        apiQuery.money.transactions.inbox.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_TRANSACTIONS,
        live
    );

    const listQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: {
                householdId: householdId!,
                limit: 100,
                period: periodKey,
                search: deferredSearch || undefined,
                jarId: jarFilter === 'all' ? undefined : jarFilter,
            },
        }),
        EMPTY_TRANSACTION_PAGE,
        live
    );

    const jarsQuery = useLiveQuery(
        apiQuery.money.jars.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_JARS,
        live
    );

    const debtsQuery = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_DEBTS,
        live
    );

    const fixedCostsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_FIXED,
        live
    );

    const settlementsQuery = useLiveQuery(
        apiQuery.money.fixedCosts.listSettlements.queryOptions({
            input: { householdId: householdId!, period: periodKey },
        }),
        [] as never,
        live
    );

    const rulesQuery = useLiveQuery(
        apiQuery.money.rules.list.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_RULES,
        live
    );

    const merchantsQuery = useLiveQuery(
        apiQuery.money.catalogs.merchantPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        EMPTY_MERCHANTS,
        live
    );
    const categoryTemplatesQuery = useCategoryTemplates(live);
    const { byKey: jarByKey } = useJarCatalog();

    const inbox = inboxQuery.data ?? EMPTY_TRANSACTIONS;
    const jars = jarsQuery.data ?? EMPTY_JARS;
    const debts = debtsQuery.data ?? EMPTY_DEBTS;
    const fixedCosts = fixedCostsQuery.data ?? EMPTY_FIXED;
    const settlements = settlementsQuery.data ?? [];
    const spendableJars = jars.filter(jar => jarCapabilitiesFor(jar.key).canSpend);
    const jarById = new Map(jars.map(jar => [jar.id, jar]));
    const rules = rulesQuery.data ?? EMPTY_RULES;
    const managedRules = rules.filter(rule => rule.priority < EXPLICIT_RULE_PRIORITY_MAX);
    const merchants = merchantsQuery.data ?? EMPTY_MERCHANTS;
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const all = (listQuery.data?.items ?? [])
        .slice()
        .sort((left, right) => right.bookedOn.localeCompare(left.bookedOn));

    const inboxVisible = useMemo(() => {
        if (!deferredSearch) return inbox;
        const needle = deferredSearch.toLowerCase();
        return inbox.filter(transaction => {
            const hay =
                `${transaction.counterparty ?? ''} ${transaction.description} ${transaction.note ?? ''}`.toLowerCase();
            return hay.includes(needle);
        });
    }, [inbox, deferredSearch]);

    const outItems = useMemo(() => {
        const filtered = all.filter(
            transaction =>
                transaction.amount < 0 &&
                matchesAmountRange(Math.abs(transaction.amount), amountRange)
        );
        return sortLedger(filtered, ledgerSort);
    }, [all, amountRange, ledgerSort]);

    const inItems = useMemo(() => {
        const filtered = all.filter(
            transaction =>
                transaction.amount > 0 &&
                matchesAmountRange(Math.abs(transaction.amount), amountRange)
        );
        return sortLedger(filtered, ledgerSort);
    }, [all, amountRange, ledgerSort]);

    const jarFilterOptions = useMemo(
        () => [
            { key: 'all', label: t('filter_all') },
            ...jars.map(jar => ({ key: jar.id, label: jar.name })),
        ],
        [jars, t]
    );

    const amountFilterActive =
        amountRange[0] !== AMOUNT_RANGE_DEFAULT[0] || amountRange[1] !== AMOUNT_RANGE_DEFAULT[1];

    const amountMinLabel = formatMoney(amountRange[0]);
    const amountMaxLabel =
        amountRange[1] >= AMOUNT_MAX
            ? t('amount_over', { amount: formatMoney(AMOUNT_MAX) })
            : formatMoney(amountRange[1]);

    const ledgerSortOptions = useMemo(
        () =>
            [
                { key: 'date-new' as const, label: t('sort_date_new') },
                { key: 'date-old' as const, label: t('sort_date_old') },
                { key: 'amount-high' as const, label: t('sort_amount_high') },
                { key: 'amount-low' as const, label: t('sort_amount_low') },
            ] as const,
        [t]
    );

    const sortMutation = useMutation({
        mutationFn: async ({
            transactionId,
            jarId,
            createRule,
            debtId,
            fixedCostId,
        }: {
            transactionId: string;
            jarId: string;
            createRule?: boolean;
            debtId?: string | null;
            fixedCostId?: string | null;
        }) => {
            if (!householdId) throw new Error('No household');
            return api.money.transactions.sort({
                householdId,
                transactionId,
                jarId,
                createRule: createRule ?? false,
                debtId: debtId ?? null,
                fixedCostId: fixedCostId ?? null,
            });
        },
        onSuccess: (_data, vars) => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.inbox.key(),
            });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.list.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.debts.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.fixedCosts.key() });
            // Juist also upserts soft payee memory into rules.
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
            if (vars.createRule) {
                showToast(t('toast_sorted'), 'success');
            } else {
                showToast(
                    vars.fixedCostId
                        ? t('toast_sorted_fixed')
                        : vars.debtId
                          ? t('toast_sorted_debt')
                          : t('toast_sorted_tx'),
                    'success'
                );
            }
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const replayMutation = useMutation({
        mutationFn: async () => {
            if (!householdId) throw new Error('No household');
            return api.money.rules.replay({ householdId });
        },
        onSuccess: result => {
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.inbox.key(),
            });
            void queryClient.invalidateQueries({
                queryKey: apiQuery.money.transactions.list.key(),
            });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.jars.balances.key() });
            showToast(
                result.sorted > 0
                    ? t(
                          result.sorted === 1
                              ? 'toast_rules_sorted_one'
                              : 'toast_rules_sorted_other',
                          { count: String(result.sorted) }
                      )
                    : t('toast_rules_no_match'),
                result.sorted > 0 ? 'success' : 'info'
            );
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    const removeRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.rules.remove({ householdId, id });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
            showToast(t('toast_rule_deleted'), 'success');
        },
        onError: (error: unknown) => showToast(apiError(error), 'error'),
    });

    function resolveJarId(fallbackKey: JarKey): string {
        const match = jars.find(jar => jar.key === fallbackKey);
        return match?.id ?? jars[0]?.id ?? fallbackKey;
    }

    const payeeMemory = buildPayeeJarMemory(all);

    function suggestionFor(transaction: Transaction) {
        return suggestInboxJar({
            transaction,
            jars,
            merchants,
            rules,
            payeeMemory,
        });
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    {t('eyebrow')}
                </Typography>
                <Typography as="h1" className="mt-2">
                    {t('title')}
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    {t('lead')}
                </Typography>
            </div>

            <ListToolbar
                createLabel={tab === 'IN' ? t('add_in') : t('add_out')}
                createHref={createTxHref({ direction: tab === 'IN' ? 'in' : 'out' })}
                secondary={
                    live && (tab === 'INBOX' || tab === 'RULES') && managedRules.length > 0 ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={replayMutation.isPending}
                            onClick={() => void replayMutation.mutateAsync()}>
                            {replayMutation.isPending ? t('working') : t('apply_rules')}
                        </Button>
                    ) : null
                }>
                {(
                    [
                        ['INBOX', t('tab_inbox')],
                        ['OUT', t('tab_out')],
                        ['IN', t('tab_in')],
                        ['RULES', t('tab_rules')],
                    ] as const
                ).map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => setTab(id)}
                        className={cn(
                            'flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-medium tracking-wide uppercase transition-all duration-200',
                            tab === id
                                ? 'border-accent/40 bg-accent-soft text-accent'
                                : 'border-line text-fg-muted hover:border-line-strong hover:text-fg'
                        )}>
                        {label}
                        {id === 'INBOX' && inbox.length > 0 && (
                            <span className="rounded-full bg-warning/15 px-2 py-0.5 font-mono text-xs text-warning">
                                {inbox.length}
                            </span>
                        )}
                        {id === 'RULES' && managedRules.length > 0 && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">
                                {managedRules.length}
                            </span>
                        )}
                    </button>
                ))}
            </ListToolbar>

            {tab === 'INBOX' ? (
                <div className="mb-3 grid gap-2.5">
                    <p className="text-sm text-fg-muted">
                        {t('import_hint_lead')}{' '}
                        <Link
                            href={CREATE_HREF.importStatement}
                            className="font-medium text-accent hover:underline">
                            {t('import_hint_link')}
                        </Link>
                    </p>
                    <ListControls
                        search={{
                            value: search,
                            onChange: setSearch,
                            placeholder: t('search_placeholder'),
                            ariaLabel: t('search_aria'),
                        }}
                    />
                </div>
            ) : null}

            {tab === 'INBOX' &&
                (inbox.length === 0 ? (
                    <EmptyState
                        icon="check"
                        title={t('inbox_empty_title')}
                        body={t('inbox_empty_body')}
                    />
                ) : inboxVisible.length === 0 ? (
                    <EmptyState
                        variant="compact"
                        title={t('empty_search_title')}
                        body={t('empty_search_body')}
                    />
                ) : (
                    <div className="grid gap-3">
                        {inboxVisible.map(transaction => {
                            const suggestion = suggestionFor(transaction);
                            const suggestedJarId =
                                suggestion.jarId ??
                                resolveJarId(suggestion.jarKey ?? JarKey.NECESSITIES);
                            const title =
                                transaction.counterparty?.trim() || transaction.description;
                            const catalog = findCatalogMerchantFromFeed(title, merchants);
                            const suggestedFixed = suggestFixedCostForTx(
                                transaction,
                                fixedCosts,
                                settlements
                            );
                            return (
                                <InboxSortCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    jars={transaction.amount < 0 ? spendableJars : jars}
                                    debts={debts}
                                    suggestedFixedCost={suggestedFixed}
                                    suggestedJarId={suggestedJarId}
                                    suggestionConfidence={suggestion.confidence}
                                    logoDomain={catalog?.logoDomain}
                                    onConfirm={
                                        live
                                            ? async (
                                                  transactionId,
                                                  jarId,
                                                  createRule,
                                                  debtId,
                                                  fixedCostId
                                              ) => {
                                                  await sortMutation.mutateAsync({
                                                      transactionId,
                                                      jarId,
                                                      createRule,
                                                      debtId,
                                                      fixedCostId,
                                                  });
                                              }
                                            : undefined
                                    }
                                    detailHref={txDetailHref(transaction.id)}
                                />
                            );
                        })}
                    </div>
                ))}

            {tab === 'OUT' || tab === 'IN' ? (
                <div className="grid gap-3">
                    <ListControls
                        title={
                            <Typography as="p" size="sm" color="muted" className="leading-snug">
                                {tab === 'OUT' ? t('out_lead') : t('in_lead')}
                            </Typography>
                        }
                        search={{
                            value: search,
                            onChange: setSearch,
                            placeholder: t('search_placeholder'),
                            ariaLabel: t('search_aria'),
                        }}
                        sort={{
                            value: ledgerSort,
                            options: ledgerSortOptions,
                            onChange: next => {
                                if (isLedgerSort(next)) setLedgerSort(next);
                            },
                            label: t('sort_label'),
                            ariaLabel: t('sort_aria'),
                        }}
                        filters={{
                            value: jarFilter,
                            options: jarFilterOptions,
                            onChange: setJarFilter,
                            ariaLabel: t('filter_jar_aria'),
                        }}
                        end={
                            <div
                                className="flex items-center gap-1.5"
                                role="group"
                                aria-label={t('ledger_layout_aria')}>
                                {(
                                    [
                                        { key: 'list' as const, label: t('layout_list') },
                                        { key: 'jar' as const, label: t('layout_by_jar') },
                                    ] as const
                                ).map(option => (
                                    <ListControlsChip
                                        key={option.key}
                                        active={ledgerLayout === option.key}
                                        onClick={() => setLedgerLayout(option.key)}>
                                        {option.label}
                                    </ListControlsChip>
                                ))}
                            </div>
                        }>
                        <div className="grid max-w-md gap-2" aria-label={t('filter_amount_aria')}>
                            <span className="font-mono text-[10px] tracking-widest text-fg-muted uppercase">
                                {t('filter_amount_label')}
                            </span>
                            <Slider
                                min={0}
                                max={AMOUNT_MAX}
                                step={AMOUNT_STEP}
                                minStepsBetweenThumbs={1}
                                value={amountRange}
                                onValueChange={next => {
                                    const low = next[0] ?? 0;
                                    const high = next[1] ?? AMOUNT_MAX;
                                    setAmountRange([low, high]);
                                }}
                                aria-label={t('filter_amount_aria')}
                                className="w-full"
                            />
                            <div className="flex items-center justify-between gap-3">
                                <span className="font-mono text-[10px] tracking-wide text-fg tabular-nums">
                                    {amountMinLabel}
                                </span>
                                <span className="font-mono text-[10px] tracking-wide text-fg tabular-nums">
                                    {amountMaxLabel}
                                </span>
                            </div>
                        </div>
                    </ListControls>
                    <Card className="overflow-hidden p-0">
                        {(() => {
                            const items = tab === 'OUT' ? outItems : inItems;
                            if (items.length === 0) {
                                const filtering =
                                    deferredSearch.length > 0 ||
                                    jarFilter !== 'all' ||
                                    amountFilterActive;
                                return (
                                    <EmptyState
                                        variant="compact"
                                        className="border-0 bg-transparent"
                                        title={
                                            filtering
                                                ? t('empty_search_title')
                                                : tab === 'OUT'
                                                  ? t('empty_out_title')
                                                  : t('empty_in_title')
                                        }
                                        body={
                                            filtering
                                                ? t('empty_search_body')
                                                : tab === 'OUT'
                                                  ? t('empty_out_body')
                                                  : t('empty_in_body')
                                        }
                                    />
                                );
                            }

                            function renderTx(transaction: Transaction) {
                                const jar = transaction.jarId
                                    ? jarById.get(transaction.jarId)
                                    : undefined;
                                const title =
                                    transaction.counterparty?.trim() || transaction.description;
                                const feedText = `${transaction.counterparty ?? ''} ${transaction.description}`;
                                const merchant = findCatalogMerchantFromFeed(feedText, merchants);
                                const jarKey =
                                    jar?.key ??
                                    merchant?.jarKey ??
                                    suggestionFor(transaction).jarKey ??
                                    JarKey.NECESSITIES;
                                const mark = partyMark(
                                    merchant ?? { name: title },
                                    catalogMarkChrome({
                                        billName: title,
                                        searchText: feedText,
                                        categoryTemplateKey: merchant?.categoryTemplateKey,
                                        jarKey,
                                        jarByKey,
                                        categoryTemplates,
                                    })
                                );
                                const subtitle = [
                                    transaction.note?.trim() || null,
                                    !transaction.note?.trim() &&
                                    transaction.counterparty?.trim() &&
                                    transaction.description !== transaction.counterparty.trim()
                                        ? transaction.description
                                        : null,
                                ]
                                    .filter(Boolean)
                                    .join(' · ');
                                return (
                                    <MoneyPartyRow
                                        key={transaction.id}
                                        title={title}
                                        subtitle={subtitle || null}
                                        mark={mark}
                                        amount={formatMoney(transaction.amount, {
                                            signed: true,
                                        })}
                                        amountClassName={
                                            transaction.amount < 0 ? 'text-fg' : 'text-success'
                                        }
                                        badges={
                                            <>
                                                <MetaChip>
                                                    {formatBookedDate(
                                                        transaction.bookedOn,
                                                        appLocale
                                                    )}
                                                </MetaChip>
                                                {transaction.status === TransactionStatus.INBOX ? (
                                                    <MetaChip>{t('inbox_chip')}</MetaChip>
                                                ) : (
                                                    <JarBadge jarKey={jar?.key} name={jar?.name} />
                                                )}
                                            </>
                                        }
                                        href={txDetailHref(transaction.id)}
                                    />
                                );
                            }

                            if (ledgerLayout === 'list') {
                                return <div className="grid gap-px">{items.map(renderTx)}</div>;
                            }

                            const groups = new Map<
                                string,
                                { jar: Jar | undefined; items: Transaction[] }
                            >();
                            for (const tx of items) {
                                const key = tx.jarId ?? 'none';
                                const existing = groups.get(key);
                                if (existing) existing.items.push(tx);
                                else
                                    groups.set(key, {
                                        jar: tx.jarId ? jarById.get(tx.jarId) : undefined,
                                        items: [tx],
                                    });
                            }
                            const ordered = [...groups.entries()].sort((left, right) => {
                                const leftName = left[1].jar?.name ?? t('unassigned');
                                const rightName = right[1].jar?.name ?? t('unassigned');
                                return leftName.localeCompare(rightName);
                            });

                            return (
                                <div className="grid">
                                    {ordered.map(([jarId, group]) => {
                                        const open =
                                            openJarIds.size === 0 ? true : openJarIds.has(jarId);
                                        const label = group.jar?.name ?? t('unassigned');
                                        return (
                                            <div key={jarId}>
                                                <button
                                                    type="button"
                                                    aria-expanded={open}
                                                    onClick={() =>
                                                        setOpenJarIds(previous => {
                                                            const baseline =
                                                                previous.size === 0
                                                                    ? new Set(
                                                                          ordered.map(
                                                                              entry => entry[0]
                                                                          )
                                                                      )
                                                                    : new Set(previous);
                                                            if (baseline.has(jarId)) {
                                                                baseline.delete(jarId);
                                                            } else {
                                                                baseline.add(jarId);
                                                            }
                                                            return baseline;
                                                        })
                                                    }
                                                    className="flex w-full items-center justify-between gap-3 border-b border-line bg-raised/60 px-5 py-2.5 text-left hover:bg-raised">
                                                    <JarBadge
                                                        jarKey={group.jar?.key}
                                                        name={label}
                                                    />
                                                    <span className="flex items-center gap-2">
                                                        <span className="font-mono text-[11px] text-fg-faint">
                                                            {group.items.length}
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
                                                {open ? (
                                                    <div className="grid gap-px">
                                                        {group.items.map(renderTx)}
                                                    </div>
                                                ) : null}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </Card>
                </div>
            ) : null}

            {tab === 'RULES' &&
                (!live ? (
                    <EmptyState
                        icon="diamond"
                        title={t('rules_sign_in_title')}
                        body={t('rules_sign_in_body')}
                    />
                ) : managedRules.length === 0 ? (
                    <EmptyState
                        icon="diamond"
                        title={t('rules_empty_title')}
                        body={t('rules_empty_body')}
                    />
                ) : (
                    <div className="grid gap-3">
                        <Typography as="p" size="sm" color="muted">
                            {t('rules_help')}
                        </Typography>
                        <Card className="overflow-hidden p-0">
                            <div className="grid gap-px">
                                {managedRules.map(rule => {
                                    const jar = jarById.get(rule.jarId);
                                    return (
                                        <div
                                            key={rule.id}
                                            className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                                            <div className="min-w-0">
                                                <p className="text-sm text-fg">
                                                    {t('rule_if', {
                                                        field: t(FIELD_KEY[rule.field]),
                                                        matcher: t(MATCHER_KEY[rule.matcher]),
                                                        value: rule.matchValue,
                                                    })}
                                                </p>
                                                <p className="mt-1 font-mono text-xs tracking-normal text-fg-faint uppercase">
                                                    {t('rule_meta', {
                                                        jar: jar?.name ?? t('jar_fallback'),
                                                        priority: String(rule.priority),
                                                        hits: t(
                                                            rule.hitCount === 1
                                                                ? 'hits_one'
                                                                : 'hits_other',
                                                            { count: String(rule.hitCount) }
                                                        ),
                                                    })}
                                                    {!rule.isActive ? t('rule_off') : ''}
                                                </p>
                                            </div>
                                            <ConfirmActionButton
                                                variant="ghost"
                                                size="sm"
                                                className="text-danger hover:bg-danger/10 hover:text-danger"
                                                disabled={removeRuleMutation.isPending}
                                                pending={removeRuleMutation.isPending}
                                                label={t('delete')}
                                                confirmLabel={t('delete_confirm')}
                                                onConfirm={() =>
                                                    void removeRuleMutation.mutateAsync(rule.id)
                                                }
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                ))}
        </div>
    );
}
