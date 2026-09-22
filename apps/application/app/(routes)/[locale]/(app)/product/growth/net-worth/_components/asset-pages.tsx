'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { AssetForm } from '@/components/features/forms/asset-form';
import { useEntityGetForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';

export function AssetUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityGetForEdit({
        translationNamespace: 'features.growth.net_worth.detail',
        getOptions: apiQuery.growth.assets.get.queryOptions({
            input: { householdId: householdId!, id },
        }),
        mapRow: row => ({
            kind: row.kindKey,
            name: row.name,
            value: minorUnitsToAmountInput(row.value),
            flow: row.flow > 0 ? minorUnitsToAmountInput(row.flow) : '',
            presetKey: row.presetKey,
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <AssetForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            defaultValues={loaded.values}
        />
    );
}
