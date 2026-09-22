'use client';

import { apiQuery } from '@/app/_lib/api-hooks';

import { Cadence, DebtScheduleKind } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { minorUnitsToAmountInput } from '@/app/_lib/money-input';
import { isLiveData } from '@/app/_lib/preview';
import { DebtForm } from '@/components/features/forms/debt-form';
import { useAuth } from '@/components/features/shell/auth-provider';

export function DebtCreatePage({ embedded = false }: { embedded?: boolean }) {
    return <DebtForm mode="create" embedded={embedded} />;
}

export function DebtUpdatePage({ id, embedded = false }: { id: string; embedded?: boolean }) {
    const t = useTranslations('features.money.debt.detail');
    const { householdId } = useAuth();
    const live = isLiveData(householdId);

    const query = useLiveQuery(
        apiQuery.money.debts.list.queryOptions({ input: { householdId: householdId! } }),
        [] as never,
        live
    );
    const row = (query.data ?? []).find(debt => debt.id === id);

    if (live && query.isLoading && !row) {
        return (
            <Typography as="p" size="sm" color="muted">
                {t('loading')}
            </Typography>
        );
    }
    if (!row) {
        return <p className="text-sm text-fg-muted">{t('not_found')}</p>;
    }

    return (
        <DebtForm
            mode="edit"
            entityId={row.id}
            embedded={embedded}
            defaultValues={{
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
            }}
        />
    );
}
