'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { productPath } from '@/app/_lib/routes';
import { GoalForm } from '@/components/features/forms/goal-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { PlanCapacityReached } from '@/components/features/shell/plan-capacity-reached';
import { useAuth } from '@/components/features/shell/auth-provider';
import { usePlanCapacity } from '@/components/features/shell/use-plan-capacity';
import type { Goal } from '@rumtelo/contracts';
import { GoalKind, GoalStatus } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';

export function GoalCreatePage({
    embedded = false,
    defaultKind,
    defaultJarId,
}: {
    embedded?: boolean;
    defaultKind?: GoalKind;
    defaultJarId?: string;
}) {
    const t = useTranslations('features.growth.goals');
    const { householdId } = useAuth();
    const goalsQuery = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        Boolean(householdId)
    );
    const occupied = (goalsQuery.data ?? []).filter(
        goal => goal.status === GoalStatus.ACTIVE
    ).length;
    const capacity = usePlanCapacity('maxGoals', occupied);
    // Wait for the list before allowing create when the plan has a finite ceiling.
    if (capacity.planReady && capacity.max !== null && goalsQuery.isPending) return null;

    if (!capacity.canAdd) {
        return (
            <PlanCapacityReached
                limitKey="maxGoals"
                occupied={occupied}
                title={t('capacity_full_title')}
                body={t('capacity_full_body', { max: capacity.max ?? occupied })}
            />
        );
    }

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
        listHref: productPath('growth/goals'),
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
            givingOrganizationKey: row.givingOrganizationKey ?? null,
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
