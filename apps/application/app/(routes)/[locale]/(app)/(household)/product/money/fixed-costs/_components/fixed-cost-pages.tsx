'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import {
    FixedCostForm,
    type FixedCostFormValues,
    type GivePayeeMode,
} from '@/components/features/forms/fixed-cost-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';

export type FixedCostCreatePrefill = Partial<FixedCostFormValues> & {
    payeeMode?: GivePayeeMode;
    orgKey?: string;
    merchantKey?: string;
    /** Link this ledger row after create (settlement for the booked month). */
    transactionId?: string;
};

export function FixedCostCreatePage({
    embedded = false,
    defaultValues,
}: {
    embedded?: boolean;
    defaultValues?: FixedCostCreatePrefill;
}) {
    const { payeeMode, orgKey, merchantKey, transactionId, ...formDefaults } = defaultValues ?? {};
    return (
        <FixedCostForm
            mode="create"
            embedded={embedded}
            defaultValues={formDefaults}
            defaultGivePayeeMode={payeeMode ?? null}
            defaultOrgKey={orgKey ?? null}
            defaultMerchantKey={merchantKey ?? null}
            linkTransactionId={transactionId ?? null}
        />
    );
}

export function FixedCostUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityForEdit({
        translationNamespace: 'features.money.fixed.detail',
        listOptions: apiQuery.money.fixedCosts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: row => ({
            name: row.name,
            counterparty: row.counterparty ?? '',
            amount: minorUnitsToAmountInput(Math.abs(row.amount)),
            jarId: row.jarId,
            dueDay: row.dueDay !== null ? String(row.dueDay) : '',
            startedOn: row.startedOn ?? '',
            endsOn: row.endsOn ?? '',
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <FixedCostForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            defaultValues={loaded.values}
        />
    );
}
