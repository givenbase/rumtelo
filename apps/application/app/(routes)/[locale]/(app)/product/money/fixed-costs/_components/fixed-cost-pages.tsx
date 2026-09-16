'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { useLiveQuery } from '@rumtelo/hooks';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import {
    FixedCostForm,
    type FixedCostFormValues,
    type GivePayeeMode,
} from '@/components/features/forms/fixed-cost-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export type FixedCostCreatePrefill = Partial<FixedCostFormValues> & {
    payeeMode?: GivePayeeMode;
    /** GivingOrganisation catalog key (Coach path). */
    orgKey?: string;
    /** MerchantPreset key (I know who path). */
    merchantKey?: string;
};

export function FixedCostCreatePage({
    embedded = false,
    defaultValues,
}: {
    embedded?: boolean;
    /** Cross-route prefill (jar, organisation, name, Give payee path) — e.g. Soul → Giving. */
    defaultValues?: FixedCostCreatePrefill;
}) {
    const { payeeMode, orgKey, merchantKey, ...formDefaults } = defaultValues ?? {};
    return (
        <FixedCostForm
            mode="create"
            embedded={embedded}
            defaultValues={formDefaults}
            defaultGivePayeeMode={payeeMode ?? null}
            defaultOrgKey={orgKey ?? null}
            defaultMerchantKey={merchantKey ?? null}
        />
    );
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
