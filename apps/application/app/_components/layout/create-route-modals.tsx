'use client';

import { GoalCreatePage, GoalUpdatePage } from '@/product/growth/goals/_components/goal-pages';
import {
    IncomeCreatePage,
    IncomeUpdatePage,
} from '@/product/growth/income/_components/income-pages';
import { DebtCreatePage, DebtUpdatePage } from '@/product/money/debt/_components/debt-pages';
import {
    FixedCostCreatePage,
    FixedCostUpdatePage,
} from '@/product/money/fixed-costs/_components/fixed-cost-pages';
import {
    ExpenseCreatePage,
    ExpenseUpdatePage,
} from '@/product/money/transactions/_components/expense-pages';
import type { GoalKind } from '@rumtelo/contracts';

import { formRoute, moveCreateMeta } from '@/app/_lib/form-route-meta';
import type { FixedCostFormValues } from '@/components/features/forms/fixed-cost-form';
import { MoveMoneyForm } from '@/components/features/forms/move-money-form';
import { SheetStubForm } from '@/components/features/forms/sheet-stub-form';
import { RouteModalShell } from '@/components/layout/route-modal-shell';

type ShellProps = {
    closeHref: string;
};

type FixedCostPrefill = Partial<FixedCostFormValues>;

export function TxCreateModalShell({
    closeHref,
    defaultJarId,
    direction = 'out',
}: ShellProps & { defaultJarId?: string; direction?: 'out' | 'in' }) {
    const meta = formRoute('txCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <ExpenseCreatePage embedded defaultJarId={defaultJarId} direction={direction} />
        </RouteModalShell>
    );
}

export function TxUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('txUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <ExpenseUpdatePage id={id} embedded />
        </RouteModalShell>
    );
}

export function FixedCostCreateModalShell({
    closeHref,
    defaultValues,
}: ShellProps & { defaultValues?: FixedCostPrefill }) {
    const meta = formRoute('fixedCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <FixedCostCreatePage embedded defaultValues={defaultValues} />
        </RouteModalShell>
    );
}

export function FixedCostUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('fixedUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <FixedCostUpdatePage id={id} embedded />
        </RouteModalShell>
    );
}

export function DebtCreateModalShell({ closeHref }: ShellProps) {
    const meta = formRoute('debtCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <DebtCreatePage embedded />
        </RouteModalShell>
    );
}

export function DebtUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('debtUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <DebtUpdatePage id={id} embedded />
        </RouteModalShell>
    );
}

export function IncomeCreateModalShell({ closeHref }: ShellProps) {
    const meta = formRoute('incomeCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <IncomeCreatePage embedded />
        </RouteModalShell>
    );
}

export function IncomeUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('incomeUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <IncomeUpdatePage id={id} embedded />
        </RouteModalShell>
    );
}

export function GoalCreateModalShell({
    closeHref,
    defaultKind,
}: ShellProps & { defaultKind?: GoalKind }) {
    const meta = formRoute('goalCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <GoalCreatePage embedded defaultKind={defaultKind} />
        </RouteModalShell>
    );
}

export function GoalUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('goalUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <GoalUpdatePage id={id} embedded />
        </RouteModalShell>
    );
}

export function AssetCreateModalShell({ closeHref }: ShellProps) {
    const meta = formRoute('assetCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <SheetStubForm kind="asset" mode="create" embedded />
        </RouteModalShell>
    );
}

export function SessionCreateModalShell({ closeHref }: ShellProps) {
    const meta = formRoute('sessionCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <SheetStubForm kind="session" mode="create" embedded />
        </RouteModalShell>
    );
}

export function MoveMoneyCreateModalShell({
    closeHref,
    defaultFromJarId,
}: ShellProps & { defaultFromJarId?: string }) {
    const meta = moveCreateMeta(defaultFromJarId);
    return (
        <RouteModalShell
            closeHref={closeHref}
            width={meta.width ?? 'wide'}
            title={meta.title}
            description={meta.description}>
            <MoveMoneyForm embedded defaultFromJarId={defaultFromJarId} />
        </RouteModalShell>
    );
}
