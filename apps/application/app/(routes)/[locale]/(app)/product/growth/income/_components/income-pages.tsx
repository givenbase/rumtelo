'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { IncomeForm } from '@/components/features/forms/income-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function IncomeCreatePage({ embedded = false }: { embedded?: boolean }) {
    return <IncomeForm mode="create" embedded={embedded} />;
}

export function IncomeUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.income.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find(source => source.id === id);

    if (live && query.isLoading && !row) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!row) {
        return <p className="text-sm text-fg-muted">Income source not found.</p>;
    }

    return (
        <IncomeForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            periods={row.periods ?? []}
            defaultValues={{
                name: row.name,
                amount: minorUnitsToAmountInput(row.amount),
                kind: row.kind,
                cadence: row.cadence,
            }}
        />
    );
}
