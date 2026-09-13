'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import { GoalKind } from '@rumtelo/contracts';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { GoalForm } from '@/components/features/forms/goal-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function GoalCreatePage({
    embedded = false,
    defaultKind,
}: {
    embedded?: boolean;
    /** Cross-route prefill — e.g. GIVE from Soul → Giving. */
    defaultKind?: GoalKind;
}) {
    return (
        <GoalForm
            mode="create"
            embedded={embedded}
            defaultValues={defaultKind ? { kind: defaultKind } : undefined}
        />
    );
}

export function GoalUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.goals.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find(goal => goal.id === id) as
        | {
              id: string;
              kind?: string;
              name: string;
              target: number;
              monthlyContribution: number;
              jarId?: string | null;
              why?: string | null;
          }
        | undefined;

    if (live && query.isLoading && !row) {
        return <p className="text-sm text-fg-muted">Loading…</p>;
    }
    if (!row) {
        return <p className="text-sm text-fg-muted">Goal not found.</p>;
    }

    return (
        <GoalForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
                kind: (row.kind as GoalKind | undefined) ?? GoalKind.SAVE,
                name: row.name,
                target: minorUnitsToAmountInput(row.target),
                monthlyContribution: minorUnitsToAmountInput(row.monthlyContribution),
                jarId: row.jarId ?? '',
                why: row.why ?? '',
            }}
        />
    );
}
