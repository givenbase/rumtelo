'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import {
    FixedCostForm,
    type FixedCostFormValues,
} from '@/components/features/forms/fixed-cost-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function FixedCostCreatePage({
    embedded = false,
    defaultValues,
}: {
    embedded?: boolean;
    /** Cross-route prefill (jar, organisation, name) — e.g. from Soul → Giving. */
    defaultValues?: Partial<FixedCostFormValues>;
}) {
    return <FixedCostForm mode="create" embedded={embedded} defaultValues={defaultValues} />;
}

export function FixedCostUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.fixedCosts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find(fixedCost => fixedCost.id === id);

    if (live && query.isLoading && !row) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!row) {
        return <p className="text-sm text-fg-muted">Fixed cost not found.</p>;
    }

    return (
        <FixedCostForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
                name: row.name,
                counterparty: row.counterparty ?? '',
                amount: minorUnitsToAmountInput(Math.abs(row.amount)),
                jarId: row.jarId,
                dueDay: row.dueDay !== null ? String(row.dueDay) : '',
            }}
        />
    );
}
