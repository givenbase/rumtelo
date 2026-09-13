'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import type { Transaction } from '@rumtelo/contracts';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { ExpenseForm } from '@/components/features/forms/expense-form';
import { TRANSACTION_IN_PRESETS } from '@/components/features/forms/transaction-in-presets';
import { useAuth } from '@/components/features/shell/auth-provider';

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_TRANSACTION_PAGE = { items: EMPTY_TRANSACTIONS, nextCursor: null };

export function ExpenseCreatePage({
    embedded = false,
    defaultJarId,
    direction = 'out',
}: {
    embedded?: boolean;
    defaultJarId?: string;
    direction?: 'out' | 'in';
}) {
    return (
        <ExpenseForm
            mode="create"
            embedded={embedded}
            direction={direction}
            defaultValues={defaultJarId ? { jarId: defaultJarId } : undefined}
        />
    );
}

export function ExpenseUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const listQuery = useLiveQuery(
        apiQuery.money.transactions.list.queryOptions({
            input: { householdId: householdId!, limit: 100 },
        }),
        EMPTY_TRANSACTION_PAGE,
        live
    );
    const inboxQuery = useLiveQuery(
        apiQuery.money.transactions.inbox.queryOptions({ input: { householdId: householdId! } }),
        EMPTY_TRANSACTIONS,
        live
    );

    const fromList = listQuery.data?.items?.find(transaction => transaction.id === id);
    const fromInbox = (inboxQuery.data ?? []).find(transaction => transaction.id === id);
    const tx = fromList ?? fromInbox;

    if (live && (listQuery.isLoading || inboxQuery.isLoading) && !tx) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!tx) {
        return <p className="text-sm text-fg-muted">Transaction not found.</p>;
    }

    return (
        <ExpenseForm
            mode="edit"
            entityId={tx.id}
            embedded={embedded}
            direction={tx.amount >= 0 ? 'in' : 'out'}
            defaultValues={{
                description: tx.description,
                counterparty: tx.counterparty,
                note: tx.note ?? '',
                categoryId: tx.categoryId,
                inflowKey: tx.inflowKey,
                amount: minorUnitsToAmountInput(Math.abs(tx.amount)),
                jarId: tx.jarId ?? '',
                label:
                    tx.amount >= 0
                        ? tx.counterparty?.trim() ||
                          TRANSACTION_IN_PRESETS.find(preset => preset.key === tx.inflowKey)
                              ?.name ||
                          ''
                        : '',
            }}
        />
    );
}
