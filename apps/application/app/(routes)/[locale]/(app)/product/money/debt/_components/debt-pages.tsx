'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { DebtForm } from '@/components/features/forms/debt-form';
import { useEntityForEdit } from '@/components/features/forms/use-entity-for-edit';
import { useAuth } from '@/components/features/shell/auth-provider';
import { Cadence, DebtScheduleKind } from '@rumtelo/contracts';

export function DebtCreatePage({ embedded = false }: { embedded?: boolean }) {
    return <DebtForm mode="create" embedded={embedded} />;
}

export function DebtUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const { householdId } = useAuth();
    const loaded = useEntityForEdit({
        translationNamespace: 'features.money.debt.detail',
        listOptions: apiQuery.money.debts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: row => ({
            name: row.name,
            balance: minorUnitsToAmountInput(row.balance),
            interestRate: String(row.interestRate),
            minimumPayment: minorUnitsToAmountInput(row.minimumPayment),
            extraPayment: row.extraPayment > 0 ? minorUnitsToAmountInput(row.extraPayment) : '',
            dueDay: row.dueDay !== null ? String(row.dueDay) : '',
            startedOn: row.startedOn ?? '',
            scheduleKind: row.scheduleKind ?? DebtScheduleKind.OPEN,
            paymentCadence: row.paymentCadence ?? Cadence.MONTHLY,
            termPayments: row.termPayments !== null ? String(row.termPayments) : '',
            maturityOn: row.maturityOn ?? '',
            linkFixedCost: true,
            kind: row.kind,
        }),
    });

    if (loaded.status !== 'ready') return loaded.node;

    return (
        <DebtForm
            mode="edit"
            entityId={loaded.row.id}
            embedded={embedded}
            defaultValues={loaded.values}
        />
    );
}
