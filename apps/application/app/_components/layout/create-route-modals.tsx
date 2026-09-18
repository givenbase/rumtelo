'use client';

import { GoalCreatePage, GoalUpdatePage } from '@/product/growth/goals/_components/goal-pages';
import {
    IncomeCreatePage,
    IncomeUpdatePage,
} from '@/product/growth/income/_components/income-pages';
import { AssetUpdatePage } from '@/product/growth/net-worth/_components/asset-pages';
import { DebtCreatePage, DebtUpdatePage } from '@/product/money/debt/_components/debt-pages';
import type { FixedCostCreatePrefill } from '@/product/money/fixed-costs/_components/fixed-cost-pages';
import {
    FixedCostCreatePage,
    FixedCostUpdatePage,
} from '@/product/money/fixed-costs/_components/fixed-cost-pages';
import type { ExpenseCreatePrefill } from '@/product/money/transactions/_components/expense-pages';
import {
    ExpenseCreatePage,
    ExpenseUpdatePage,
} from '@/product/money/transactions/_components/expense-pages';
import type { GoalKind } from '@rumtelo/contracts';

import { formRoute, moveCreateMeta } from '@/app/_lib/form-route-meta';
import { MoveMoneyForm } from '@/components/features/forms/move-money-form';
import { AssetForm } from '@/components/features/forms/asset-form';
import { SheetStubForm } from '@/components/features/forms/sheet-stub-form';
import { RouteModalShell } from '@/components/layout/route-modal-shell';

type ShellProps = {
    closeHref: string;
};

export function TxCreateModalShell({
    closeHref,
    defaultJarId,
    direction = 'out',
    defaultValues,
}: ShellProps & {
    defaultJarId?: string;
    direction?: 'out' | 'in';
    defaultValues?: ExpenseCreatePrefill;
}) {
    const meta = formRoute('txCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <ExpenseCreatePage
                embedded
                defaultJarId={defaultJarId}
                direction={direction}
                defaultValues={defaultValues}
            />
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
}: ShellProps & { defaultValues?: FixedCostCreatePrefill }) {
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
    defaultJarId,
}: ShellProps & { defaultKind?: GoalKind; defaultJarId?: string }) {
    const meta = formRoute('goalCreate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <GoalCreatePage embedded defaultKind={defaultKind} defaultJarId={defaultJarId} />
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
            <AssetForm embedded />
        </RouteModalShell>
    );
}

export function AssetUpdateModalShell({ closeHref, id }: ShellProps & { id: string }) {
    const meta = formRoute('assetUpdate');
    return (
        <RouteModalShell closeHref={closeHref} title={meta.title} description={meta.description}>
            <AssetUpdatePage id={id} embedded />
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
