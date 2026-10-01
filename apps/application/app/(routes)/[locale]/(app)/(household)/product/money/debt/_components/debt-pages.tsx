'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { productPath } from '@/app/_lib/routes';
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
        listHref: productPath('money/debt'),
        listOptions: apiQuery.money.debts.list.queryOptions({
            input: { householdId: householdId! },
        }),
        id,
        mapRow: row => ({
            // Lender name lives in the form's "who" field — prefer stored counterparty,
            // fallback to name for pre-fix rows (where name == lender).
            name: row.counterparty ?? row.name,
            presetKey: row.presetKey ?? null,
            partyId: row.partyId ?? null,
            balance: minorUnitsToAmountInput(row.balance),
            interestRate: String(row.interestRate),
            minimumPayment: minorUnitsToAmountInput(row.minimumPayment),
            extraPayment: row.extraPayment > 0 ? minorUnitsToAmountInput(row.extraPayment) : '',
            dueDay: row.dueDay !== null ? String(row.dueDay) : '',
            dueMonth: row.dueMonth !== null ? String(row.dueMonth) : '',
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
