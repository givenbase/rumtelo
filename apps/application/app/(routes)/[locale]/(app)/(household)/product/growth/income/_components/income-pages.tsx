'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { IncomeForm } from '@/components/features/forms/income-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';

export function IncomeCreatePage({ embedded = false }: { embedded?: boolean }) {
    return <IncomeForm mode="create" embedded={embedded} />;
}

export function IncomeUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityForEdit({
        translationNamespace: 'features.growth.income',
        listOptions: apiQuery.money.income.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: row => ({
            name: row.name,
            amount: minorUnitsToAmountInput(row.amount),
            kind: row.kind,
            cadence: row.cadence,
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <IncomeForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            periods={loaded.row.periods ?? []}
            defaultValues={loaded.values}
        />
    );
}
