'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, EmptyState, Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    JarKey,
    RuleField,
    RuleMatcher,
    TransactionStatus,
    jarCapabilitiesFor,
    type Debt,
    type Jar,
    type MerchantPreset,
    type Rule,
    type Transaction,
} from '@rumtelo/contracts';

import { createTxHref, txDetailHref } from '@/app/_lib/create-routes';
import { matchMerchantJarKey } from '@/app/_lib/merchant-match';
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
import { ListToolbar } from '@/components/layout/list-toolbar';
import { ConfirmActionButton } from '@/components/features/forms/confirm-action-button';
import { useHouseholdCurrency } from '@/app/_lib/use-household-currency';

type Tab = 'INBOX' | 'OUT' | 'IN' | 'RULES';

const MATCHER_LABEL: Record<RuleMatcher, string> = {
    [RuleMatcher.CONTAINS]: 'contains',
    [RuleMatcher.EQUALS]: 'is',
    [RuleMatcher.STARTS_WITH]: 'starts with',
    [RuleMatcher.REGEX]: 'regex',
};

const FIELD_LABEL: Record<RuleField, string> = {
    [RuleField.DESCRIPTION]: 'description',
    [RuleField.COUNTERPARTY]: 'counterparty',
    [RuleField.AMOUNT]: 'amount',
};

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_JARS: Jar[] = [];
const EMPTY_DEBTS: Debt[] = [];
const EMPTY_RULES: Rule[] = [];
const EMPTY_MERCHANTS: MerchantPreset[] = [];
const EMPTY_TRANSACTION_PAGE = { items: EMPTY_TRANSACTIONS, nextCursor: null };

function fallbackJarKey(amount: number): JarKey {
    if (amount > 0) return JarKey.NECESSITIES;
    if (Math.abs(amount) < 2_000) return JarKey.PLAY;
    return JarKey.NECESSITIES;
}

export function TransactionsPageClient() {
    const queryClient = useQueryClient();
    const { householdId } = useAuth();
    const { showToast } = useAppShell();
    const { formatMoney } = useHouseholdCurrency();
    const [tab, setTab] = useState<Tab>('INBOX');
    const [ledgerLayout, setLedgerLayout] = useState<'list' | 'jar'>('list');
    const [openJarIds, setOpenJarIds] = useState<Set<string>>(() => new Set());
    const live = isLiveData(householdId);

    const inboxQuery = useLiveQuery(
        apiQuery.money.transactions.inbox.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_TRANSACTIONS,
        live
    );

    const listQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, limit: 50 },
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
    const spendableJars = jars.filter(jar => jarCapabilitiesFor(jar.key).canSpend);
    const jarById = new Map(jars.map(jar => [jar.id, jar]));
    const rules = rulesQuery.data ?? EMPTY_RULES;
    const merchants = merchantsQuery.data ?? EMPTY_MERCHANTS;
    const categoryTemplates = categoryTemplatesQuery.data ?? [];
    const all = (listQuery.data?.items ?? [])
        .slice()
        .sort((left, right) => right.bookedOn.localeCompare(left.bookedOn));
    const outItems = all.filter(transaction => transaction.amount < 0);
    const inItems = all.filter(transaction => transaction.amount > 0);

    const sortMutation = useMutation({
        mutationFn: async ({
            transactionId,
            jarId,
            createRule,
            debtId,
        }: {
            transactionId: string;
            jarId: string;
            createRule?: boolean;
            debtId?: string | null;
        }) => {
            if (!householdId) throw new Error('No household');
            return api.money.transactions.sort({
                householdId,
                transactionId,
                jarId,
                createRule: createRule ?? false,
                debtId: debtId ?? null,
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
            if (vars.createRule) {
                void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
                showToast('Sorted and rule saved', 'success');
            } else {
                showToast(
                    vars.debtId ? 'Sorted and applied to debt' : 'Transaction sorted',
                    'success'
                );
            }
        },
        onError: () => showToast('Sort failed', 'error'),
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
                    ? `${result.sorted} transaction${result.sorted === 1 ? '' : 's'} sorted by rules`
                    : 'No matches — inbox unchanged',
                result.sorted > 0 ? 'success' : 'info'
            );
        },
        onError: () => showToast('Apply rules failed', 'error'),
    });

    const removeRuleMutation = useMutation({
        mutationFn: async (id: string) => {
            if (!householdId) throw new Error('No household');
            return api.money.rules.remove({ householdId, id });
        },
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
            showToast('Rule deleted', 'success');
        },
        onError: () => showToast('Delete failed', 'error'),
    });

    function resolveJarId(fallbackKey: JarKey): string {
        const match = jars.find(jar => jar.key === fallbackKey);
        return match?.id ?? jars[0]?.id ?? fallbackKey;
    }

    function suggestJarKeyFor(transaction: Transaction): JarKey {
        const text = `${transaction.counterparty ?? ''} ${transaction.description}`;
        return matchMerchantJarKey(text, merchants) ?? fallbackJarKey(transaction.amount);
    }

    return (
        <div className="grid animate-rise gap-8">
            <div>
                <Typography as="span" variant="eyebrow" color="primary">
                    ✦ TRANSACTIONS
                </Typography>
                <Typography as="h1" className="mt-2">
                    Only what changes. Fixed costs are elsewhere.
                </Typography>
                <Typography as="p" variant="lead" size="default" className="mt-2">
                    Out is spend. In is a gift, tax return, refund, or money you add to a jar.
                    Connecting a bank is a setting.
                </Typography>
            </div>

            <ListToolbar
                createLabel={tab === 'IN' ? '+ Add in' : '+ Add out'}
                createHref={createTxHref({ direction: tab === 'IN' ? 'in' : 'out' })}
                secondary={
                    live && (tab === 'INBOX' || tab === 'RULES') && rules.length > 0 ? (
                        <Button
                            variant="secondary"
                            size="sm"
                            disabled={replayMutation.isPending}
                            onClick={() => void replayMutation.mutateAsync()}>
                            {replayMutation.isPending ? 'Working…' : 'Apply rules'}
                        </Button>
                    ) : null
                }>
                {(
                    [
                        ['INBOX', 'To sort'],
                        ['OUT', 'Out'],
                        ['IN', 'In'],
                        ['RULES', 'Rules'],
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
                        {id === 'RULES' && rules.length > 0 && (
                            <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-xs text-accent">
                                {rules.length}
                            </span>
                        )}
                    </button>
                ))}
            </ListToolbar>

            {tab === 'INBOX' &&
                (inbox.length === 0 ? (
                    <EmptyState
                        icon="✓"
                        title="Nothing left to sort."
                        body="Every payment has a jar. Come back tomorrow — or connect a bank below."
                    />
                ) : (
                    <div className="grid gap-3">
                        {inbox.map(transaction => {
                            const suggestedKey = suggestJarKeyFor(transaction);
                            const title =
                                transaction.counterparty?.trim() || transaction.description;
                            const catalog = findCatalogMerchantFromFeed(title, merchants);
                            return (
                                <InboxSortCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    jars={transaction.amount < 0 ? spendableJars : jars}
                                    debts={debts}
                                    suggestedJarId={resolveJarId(suggestedKey)}
                                    logoDomain={catalog?.logoDomain}
                                    onConfirm={
                                        live
                                            ? async (transactionId, jarId, createRule, debtId) => {
                                                  await sortMutation.mutateAsync({
                                                      transactionId,
                                                      jarId,
                                                      createRule,
                                                      debtId,
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <Typography as="p" size="sm" color="muted">
                            {tab === 'OUT'
                                ? 'Money that left a jar. Tap a row to edit or delete it.'
                                : 'Gifts, refunds, tax returns, and jar top-ups. Tap a row to edit.'}
                        </Typography>
                        <div className="flex gap-1" role="group" aria-label="Ledger layout">
                            {(
                                [
                                    { key: 'list' as const, label: 'List' },
                                    { key: 'jar' as const, label: 'By jar' },
                                ] as const
                            ).map(option => (
                                <button
                                    key={option.key}
                                    type="button"
                                    aria-pressed={ledgerLayout === option.key}
                                    onClick={() => setLedgerLayout(option.key)}
                                    className={cn(
                                        'rounded-full border px-3 py-1 font-mono text-[10px] font-medium tracking-widest uppercase transition-colors',
                                        ledgerLayout === option.key
                                            ? 'border-accent/40 bg-accent-soft text-accent'
                                            : 'border-line text-fg-muted hover:text-accent'
                                    )}>
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <Card className="overflow-hidden p-0">
                        {(() => {
                            const items = tab === 'OUT' ? outItems : inItems;
                            if (items.length === 0) {
                                return (
                                    <Typography
                                        as="p"
                                        size="sm"
                                        color="muted"
                                        className="px-5 py-4">
                                        {tab === 'OUT'
                                            ? 'No out transactions in this period yet.'
                                            : 'No in transactions in this period yet.'}
                                    </Typography>
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
                                    jar?.key ?? merchant?.jarKey ?? suggestJarKeyFor(transaction);
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
                                                    {formatBookedDate(transaction.bookedOn)}
                                                </MetaChip>
                                                {transaction.status === TransactionStatus.INBOX ? (
                                                    <MetaChip>Inbox</MetaChip>
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
                                const leftName = left[1].jar?.name ?? 'Unassigned';
                                const rightName = right[1].jar?.name ?? 'Unassigned';
                                return leftName.localeCompare(rightName);
                            });

                            return (
                                <div className="grid">
                                    {ordered.map(([jarId, group]) => {
                                        const open =
                                            openJarIds.size === 0 ? true : openJarIds.has(jarId);
                                        const label = group.jar?.name ?? 'Unassigned';
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
                        icon="◇"
                        title="Sign in to manage rules."
                        body="Rules automatically sort inbox transactions into the right jar."
                    />
                ) : rules.length === 0 ? (
                    <EmptyState
                        icon="◇"
                        title="No rules yet."
                        body="Choose “Always this” on an inbox item to teach a rule. Manage them here afterwards."
                    />
                ) : (
                    <div className="grid gap-3">
                        <Typography as="p" size="sm" color="muted">
                            First match wins, by priority. Dead rules (0 hits) can safely be
                            deleted.
                        </Typography>
                        <Card className="overflow-hidden p-0">
                            <div className="grid gap-px">
                                {rules.map(rule => {
                                    const jar = jarById.get(rule.jarId);
                                    return (
                                        <div
                                            key={rule.id}
                                            className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 last:border-b-0">
                                            <div className="min-w-0">
                                                <p className="text-sm text-fg">
                                                    If {FIELD_LABEL[rule.field]}{' '}
                                                    {MATCHER_LABEL[rule.matcher]}{' '}
                                                    <span className="font-mono text-sm">
                                                        “{rule.value}”
                                                    </span>
                                                </p>
                                                <p className="mt-1 font-mono text-xs tracking-normal text-fg-faint uppercase">
                                                    → {jar?.name ?? 'Jar'} · prio {rule.priority} ·{' '}
                                                    {rule.hitCount} hits
                                                    {!rule.isActive ? ' · off' : ''}
                                                </p>
                                            </div>
                                            <ConfirmActionButton
                                                variant="ghost"
                                                size="sm"
                                                className="text-danger hover:bg-danger/10 hover:text-danger"
                                                disabled={removeRuleMutation.isPending}
                                                pending={removeRuleMutation.isPending}
                                                label="Delete"
                                                confirmLabel="Click again to delete"
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
