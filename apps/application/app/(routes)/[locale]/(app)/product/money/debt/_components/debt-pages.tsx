'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { DebtForm } from '@/components/features/forms/debt-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function DebtCreatePage({ embedded = false }: { embedded?: boolean }) {
    return <DebtForm mode="create" embedded={embedded} />;
}

export function DebtUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find(debt => debt.id === id);

    if (live && query.isLoading && !row) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!row) {
        return <p className="text-sm text-fg-muted">Debt not found.</p>;
    }

    return (
        <DebtForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
                name: row.name,
                balance: minorUnitsToAmountInput(row.balance),
                interestRate: String(row.interestRate),
                minimumPayment: minorUnitsToAmountInput(row.minimumPayment),
                kind: row.kind,
            }}
        />
    );
}
