'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';
import { Typography } from '@rumtelo/ui';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { AssetForm } from '@/components/features/forms/asset-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function AssetUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.growth.assets.get.queryOptions({
            input: { householdId: householdId!, id },
        }),
        null as never,
        live
    );
    const row = query.data;

    if (live && query.isLoading && !row) {
        return (
            <Typography as="p" size="sm" color="muted">
                Loading…
            </Typography>
        );
    }
    if (!row) {
        return (
            <Typography as="p" size="sm" color="muted">
                Asset not found.
            </Typography>
        );
    }

    return (
        <AssetForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
                kind: row.kindKey,
                name: row.name,
                value: minorUnitsToAmountInput(row.value),
                flow: row.flow > 0 ? minorUnitsToAmountInput(row.flow) : '',
                presetKey: row.presetKey,
            }}
        />
    );
}
