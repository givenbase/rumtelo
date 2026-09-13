'use client';

import { api } from '@/app/_lib/api';
import { apiQuery } from '@/app/_lib/api-hooks';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { Button, Card, EmptyState } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import {
    JarKey,
    RuleField,
    RuleMatcher,
    TransactionStatus,
    type Jar,
    type MerchantPreset,
    type Rule,
    type Transaction,
} from '@rumtelo/contracts';

import { createTxHref, updateHref } from '@/app/_lib/create-routes';
import { matchMerchantJarKey } from '@/app/_lib/merchant-match';
import { isLiveData } from '@/app/_lib/preview';
import { InboxSortCard } from '@/components/features/money/inbox-sort-card';
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
    const router = useRouter();
    const { formatMoney } = useHouseholdCurrency();
    const [tab, setTab] = useState<Tab>('INBOX');
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

    const inbox = inboxQuery.data ?? EMPTY_TRANSACTIONS;
    const jars = jarsQuery.data ?? EMPTY_JARS;
    const jarById = new Map(jars.map(jar => [jar.id, jar]));
    const rules = rulesQuery.data ?? EMPTY_RULES;
    const merchants = merchantsQuery.data ?? EMPTY_MERCHANTS;
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
        }: {
            transactionId: string;
            jarId: string;
            createRule?: boolean;
        }) => {
            if (!householdId) throw new Error('No household');
            return api.money.transactions.sort({
                householdId,
                transactionId,
                jarId,
                createRule: createRule ?? false,
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
            if (vars.createRule) {
                void queryClient.invalidateQueries({ queryKey: apiQuery.money.rules.list.key() });
                showToast('Sorted and rule saved', 'success');
            } else {
                showToast('Transaction sorted', 'success');
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
                <span className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
                    ✦ TRANSACTIONS
                </span>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg lg:text-4xl">
                    Only what changes. Fixed costs are elsewhere.
                </h1>
                <p className="mt-2 max-w-prose text-base text-pretty text-fg-muted">
                    Out is spend. In is a gift, tax return, refund, or money you add to a jar.
                    Connecting a bank is a setting.
                </p>
            </div>

            <ListToolbar
                createLabel={tab === 'IN' ? '+ Add in' : '+ Add out'}
                onCreate={() =>
                    router.push(createTxHref({ direction: tab === 'IN' ? 'in' : 'out' }))
                }
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
                            return (
                                <InboxSortCard
                                    key={transaction.id}
                                    transaction={transaction}
                                    jars={jars}
                                    suggestedJarId={resolveJarId(suggestedKey)}
                                    onConfirm={
                                        live
                                            ? async (transactionId, jarId, createRule) => {
                                                  await sortMutation.mutateAsync({
                                                      transactionId,
                                                      jarId,
                                                      createRule,
                                                  });
                                              }
                                            : undefined
                                    }
                                    onChange={tx => {
                                        router.push(updateHref('tx', tx.id));
                                    }}
                                />
                            );
                        })}
                    </div>
                ))}

            {tab === 'OUT' || tab === 'IN' ? (
                <div className="grid gap-3">
                    <p className="text-sm text-fg-muted">
                        {tab === 'OUT'
                            ? 'Money that left a jar. Tap a row to edit or delete it.'
                            : 'Gifts, refunds, tax returns, and jar top-ups. Tap a row to edit.'}
                    </p>
                    <Card className="overflow-hidden p-0">
                        <div className="grid gap-px">
                            {(tab === 'OUT' ? outItems : inItems).length === 0 ? (
                                <p className="px-5 py-4 text-sm text-fg-muted">
                                    {tab === 'OUT'
                                        ? 'No out transactions in this period yet.'
                                        : 'No in transactions in this period yet.'}
                                </p>
                            ) : (
                                (tab === 'OUT' ? outItems : inItems).map(transaction => {
                                    const jar = transaction.jarId
                                        ? jarById.get(transaction.jarId)
                                        : undefined;
                                    const title =
                                        transaction.counterparty?.trim() || transaction.description;
                                    const detailParts = [
                                        transaction.note?.trim() || null,
                                        !transaction.note?.trim() &&
                                        transaction.counterparty?.trim() &&
                                        transaction.description !== transaction.counterparty.trim()
                                            ? transaction.description
                                            : null,
                                    ].filter(Boolean);
                                    return (
                                        <button
                                            type="button"
                                            key={transaction.id}
                                            aria-label={title}
                                            onClick={() =>
                                                router.push(updateHref('tx', transaction.id))
                                            }
                                            className="grid w-full gap-1 border-b border-line px-5 py-3.5 text-left last:border-b-0 hover:bg-raised">
                                            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                                <span className="min-w-0 flex-1 text-sm text-fg">
                                                    {title}
                                                    {detailParts.length > 0 ? (
                                                        <span className="text-fg-muted">
                                                            {' '}
                                                            · {detailParts.join(' · ')}
                                                        </span>
                                                    ) : null}
                                                </span>
                                                <span
                                                    className={cn(
                                                        'font-mono text-sm',
                                                        transaction.amount < 0
                                                            ? 'text-fg'
                                                            : 'text-success'
                                                    )}>
                                                    {formatMoney(transaction.amount, {
                                                        signed: true,
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-2 font-mono text-xs tracking-wide text-fg-faint uppercase">
                                                <span>{transaction.bookedOn}</span>
                                                <span>·</span>
                                                <span>
                                                    {transaction.status === TransactionStatus.INBOX
                                                        ? 'Inbox'
                                                        : (jar?.name ?? 'No jar')}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
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
                        <p className="text-sm text-fg-muted">
                            First match wins, by priority. Dead rules (0 hits) can safely be
                            deleted.
                        </p>
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
