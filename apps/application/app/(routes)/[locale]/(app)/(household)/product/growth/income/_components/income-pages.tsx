'use client';

import { useSearchParams } from 'next/navigation';

import { apiQuery } from '@/app/_lib/api-hooks';
import { incomePrefillFromParams } from '@/app/_lib/create-prefill';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { IncomeForm } from '@/components/features/forms/income-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';

export type IncomeCreatePrefill = {
    /** Growth holding this income comes from — locks the holding picker (asset in). */
    assetId?: string;
};

export function IncomeCreatePage({
    embedded = false,
    defaultValues,
}: {
    embedded?: boolean;
    defaultValues?: IncomeCreatePrefill;
}) {
    return (
        <IncomeForm
            mode="create"
            embedded={embedded}
            defaultValues={defaultValues?.assetId ? { assetId: defaultValues.assetId } : undefined}
            lockAsset={Boolean(defaultValues?.assetId)}
        />
    );
}

/** Create page that reads `?assetId=` itself — for server-rendered route shells. */
export function IncomeCreateFromParams({ embedded = false }: { embedded?: boolean }) {
    const searchParams = useSearchParams();
    return (
        <IncomeCreatePage
            embedded={embedded}
            defaultValues={incomePrefillFromParams(searchParams)}
        />
    );
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
            presetKey: row.presetKey ?? null,
            counterparty: row.counterparty ?? '',
            merchantKey: row.merchantKey ?? '',
            partyId: row.partyId ?? '',
            saveParty: true,
            amount: minorUnitsToAmountInput(row.amount),
            kind: row.kind,
            cadence: row.cadence,
            startedOn: row.startedOn ?? '',
            endsOn: row.endsOn ?? '',
            assetId: row.assetId ?? null,
            bankId: row.bankId ?? null,
            accountId: row.accountId ?? null,
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
