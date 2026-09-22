'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { GoalForm } from '@/components/features/forms/goal-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';
import type { Goal } from '@rumtelo/contracts';
import { GoalKind } from '@rumtelo/contracts';

export function GoalCreatePage({
    embedded = false,
    defaultKind,
    defaultJarId,
}: {
    embedded?: boolean;
    defaultKind?: GoalKind;
    defaultJarId?: string;
}) {
    const defaults =
        defaultKind || defaultJarId
            ? {
                  ...(defaultKind ? { kind: defaultKind } : {}),
                  ...(defaultJarId ? { jarId: defaultJarId } : {}),
              }
            : undefined;
    return <GoalForm mode="create" embedded={embedded} defaultValues={defaults} />;
}

export function GoalUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityForEdit({
        translationNamespace: 'features.growth.goals.detail',
        listOptions: apiQuery.money.goals.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: (row: Goal) => ({
            kind: row.kind ?? GoalKind.SAVE,
            name: row.name,
            target: minorUnitsToAmountInput(row.target),
            monthlyContribution: minorUnitsToAmountInput(row.monthlyContribution),
            jarId: row.jarId ?? '',
            why: row.why ?? '',
            cause: row.cause ?? null,
            givingOrganisationKey: row.givingOrganisationKey ?? null,
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <GoalForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            defaultValues={loaded.values}
        />
    );
}
