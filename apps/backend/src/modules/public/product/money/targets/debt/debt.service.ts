import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { type DebtKind, PayoffStrategy } from '@rumtelo/contracts';
import { HouseholdSettings } from '../../../../../auth/household/household-settings/household-settings.entity';

import { Debt } from './debt.entity';

@Injectable()
export class DebtService {
    private readonly repo: HouseholdScopedRepository<Debt>;
    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.repo = new HouseholdScopedRepository(em, Debt);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        name: string;
        kind: string;
        balance: number;
        originalBalance?: number;
        interestRate: number;
        minimumPayment?: number;
        extraPayment?: number;
        dueDay?: number | null;
        closedOn?: string | null;
    }) {
        const entity = this.em.create(Debt, {
            household: currentHouseholdId(),
            name: input.name,
            kind: input.kind as DebtKind,
            balance: input.balance,
            originalBalance: input.originalBalance ?? input.balance,
            interestRate: Number(input.interestRate).toFixed(2),
            minimumPayment: input.minimumPayment ?? 0,
            extraPayment: input.extraPayment ?? 0,
            dueDay: input.dueDay ?? null,
            closedOn: input.closedOn ?? null,
        } as never);
        await this.em.persist(entity).flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find({ closedOn: null });
        return rows.map(toDto);
    }

    /**
     * Avalanche pays the highest rate first and costs least; snowball clears the
     * smallest balance first and is easier to sustain; minimal pays contractual
     * minimums only. We surface all three so the cheaper plan is honest about
     * what “doing nothing extra” costs.
     */
    async plan(strategy?: PayoffStrategy | null) {
        const resolved =
            strategy ??
            (
                await this.em.findOne(HouseholdSettings, {
                    household: currentHouseholdId(),
                })
            )?.moneySettings?.payoffStrategy ??
            PayoffStrategy.AVALANCHE;

        const debts = await this.repo.find({ closedOn: null });
        if (debts.length === 0) {
            return {
                strategy: resolved,
                totalBalance: 0,
                totalInterestProjected: 0,
                debtFreeOn: null,
                monthsRemaining: null,
                order: [],
            };
        }

        const ordered = [...debts].sort((left, right) => {
            if (resolved === PayoffStrategy.SNOWBALL || resolved === PayoffStrategy.MINIMAL) {
                return Number(left.balance) - Number(right.balance);
            }
            return Number(right.interestRate) - Number(left.interestRate);
        });

        const totalBalance = debts.reduce((total, debt) => total + Number(debt.balance), 0);
        // Minimal = contractual minimums only; avalanche/snowball include extras.
        const monthlyPool = debts.reduce((total, debt) => {
            const minimum = Number(debt.minimumPayment);
            const extra = resolved === PayoffStrategy.MINIMAL ? 0 : Number(debt.extraPayment);
            return total + minimum + extra;
        }, 0);

        // TODO: full amortisation with rollover of freed minimums; this is the
        // first-order estimate that keeps the screen honest until then.
        const months = monthlyPool > 0 ? Math.ceil(totalBalance / monthlyPool) : null;

        return {
            strategy: resolved,
            totalBalance,
            totalInterestProjected: 0,
            debtFreeOn: months === null ? null : addMonths(months),
            monthsRemaining: months,
            order: ordered.map(debt => ({ debtId: debt.id, name: debt.name, payoffOn: null })),
        };
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            name: string;
            kind: string;
            balance: number;
            originalBalance: number;
            interestRate: number;
            minimumPayment: number;
            extraPayment: number;
            dueDay: number | null;
            closedOn: string | null;
        }>
    ) {
        const entity = await this.repo.findOneOrFail({ id });
        if (patch.name !== undefined) entity.name = patch.name;
        if (patch.kind !== undefined) entity.kind = patch.kind as DebtKind;
        if (patch.balance !== undefined) entity.balance = patch.balance;
        if (patch.originalBalance !== undefined) entity.originalBalance = patch.originalBalance;
        if (patch.interestRate !== undefined) {
            entity.interestRate = Number(patch.interestRate).toFixed(2);
        }
        if (patch.minimumPayment !== undefined) entity.minimumPayment = patch.minimumPayment;
        if (patch.extraPayment !== undefined) entity.extraPayment = patch.extraPayment;
        if (patch.dueDay !== undefined) entity.dueDay = patch.dueDay;
        if (patch.closedOn !== undefined) entity.closedOn = patch.closedOn;
        await this.em.flush();
        return toDto(entity);
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const entity = await this.repo.findOneOrFail({ id });
        await this.em.remove(entity).flush();
        return { ok: true as const };
    }
}

function addMonths(months: number): string {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + months, 1))
        .toISOString()
        .slice(0, 10);
}

export function toDto(debt: Debt) {
    return {
        id: debt.id,
        householdId: debt.household,
        name: debt.name,
        kind: debt.kind,
        balance: Number(debt.balance),
        originalBalance: Number(debt.originalBalance),
        interestRate: Number(debt.interestRate),
        minimumPayment: Number(debt.minimumPayment),
        extraPayment: Number(debt.extraPayment),
        dueDay: debt.dueDay,
        closedOn: debt.closedOn,
    };
}
