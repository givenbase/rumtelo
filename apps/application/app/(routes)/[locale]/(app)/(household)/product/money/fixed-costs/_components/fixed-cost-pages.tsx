'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { productPath } from '@/app/_lib/routes';
import {
    FixedCostForm,
    type FixedCostFormValues,
    type GivePayeeMode,
} from '@/components/features/forms/fixed-cost-form';
import { toRecurringCadence } from '@/components/features/forms/cadence-picker';
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
            lockAsset={Boolean(formDefaults.assetId)}
        />
    );
}

export function FixedCostUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityForEdit({
        translationNamespace: 'features.money.fixed.detail',
        listHref: productPath('money/fixed-costs'),
        listOptions: apiQuery.money.fixedCosts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: row => ({
            name: row.name,
            presetKey: row.presetKey ?? null,
            counterparty: row.counterparty ?? '',
            amount: minorUnitsToAmountInput(Math.abs(row.amount)),
            cadence: toRecurringCadence(row.cadence),
            jarId: row.jarId,
            categoryId: row.categoryId,
            dueDay: row.dueDay !== null ? String(row.dueDay) : '',
            dueMonth: row.dueMonth !== null ? String(row.dueMonth) : '',
            startedOn: row.startedOn ?? '',
            endsOn: row.endsOn ?? '',
            assetId: row.assetId ?? null,
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
