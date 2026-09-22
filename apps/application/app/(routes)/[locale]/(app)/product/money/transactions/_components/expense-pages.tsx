'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';

import type { Transaction } from '@rumtelo/contracts';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { ExpenseForm, type ExpenseFormValues } from '@/components/features/forms/expense-form';
import { resolveEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';

const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_TRANSACTION_PAGE = { items: EMPTY_TRANSACTIONS, nextCursor: null };

export type ExpenseCreatePrefill = Partial<ExpenseFormValues>;

export function ExpenseCreatePage({
    embedded = false,
    defaultJarId,
    direction = 'out',
    defaultValues,
}: {
    embedded?: boolean;
    defaultJarId?: string;
    direction?: 'out' | 'in';
    /** Cross-route prefill (jar, merchantKey, categoryKey, counterparty). */
    defaultValues?: ExpenseCreatePrefill;
}) {
    const merged: ExpenseCreatePrefill | undefined = (() => {
        if (!defaultJarId && !defaultValues) return undefined;
        return {
            ...defaultValues,
            ...(defaultJarId ? { jarId: defaultValues?.jarId ?? defaultJarId } : {}),
        };
    })();

    return (
        <ExpenseForm
            mode="create"
            embedded={embedded}
            direction={direction}
            lockJar={Boolean(defaultJarId)}
            defaultValues={merged}
        />
    );
}

export function ExpenseUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const t = useTranslations('features.money.transactions.detail');
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
    const transactionInQuery = useLiveQuery(
        apiQuery.money.catalogs.transactionInPresets.list.queryOptions({
            input: { householdId: householdId! },
        }),
        [],
        live
    );

    const fromList = listQuery.data?.items?.find(transaction => transaction.id === id);
    const fromInbox = (inboxQuery.data ?? []).find(transaction => transaction.id === id);
    const tx = fromList ?? fromInbox;
    const transactionInPresets = transactionInQuery.data ?? [];

    const loaded = resolveEntityForEdit({
        t,
        loading: live && (listQuery.isLoading || inboxQuery.isLoading),
        row: tx,
        mapRow: row => ({
            description: row.description,
            counterparty: row.counterparty,
            note: row.note ?? '',
            categoryId: row.categoryId,
            inflowKey: row.inflowKey,
            amount: minorUnitsToAmountInput(Math.abs(row.amount)),
            jarId: row.jarId ?? '',
            label:
                row.amount >= 0
                    ? row.counterparty?.trim() ||
                      transactionInPresets.find(preset => preset.key === row.inflowKey)?.name ||
                      ''
                    : '',
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <ExpenseForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            direction={loaded.row.amount >= 0 ? 'in' : 'out'}
            defaultValues={loaded.values}
        />
    );
}
