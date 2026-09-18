'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import type { Goal } from '@rumtelo/contracts';
import { GoalKind } from '@rumtelo/contracts';
import { Typography } from '@rumtelo/ui';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { GoalForm } from '@/components/features/forms/goal-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function GoalCreatePage({
    embedded = false,
    defaultKind,
    defaultJarId,
}: {
    embedded?: boolean;
    /** Cross-route prefill — e.g. GIVE from Soul → Giving. */
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
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find((goal): goal is Goal => goal.id === id);

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
                Goal not found.
            </Typography>
        );
    }

    return (
        <GoalForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
                kind: row.kind ?? GoalKind.SAVE,
                name: row.name,
                target: minorUnitsToAmountInput(row.target),
                monthlyContribution: minorUnitsToAmountInput(row.monthlyContribution),
                jarId: row.jarId ?? '',
                why: row.why ?? '',
                cause: row.cause ?? null,
                givingOrganisationKey: row.givingOrganisationKey ?? null,
            }}
        />
    );
}
