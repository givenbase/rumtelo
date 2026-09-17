import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import {
    Cadence,
    DebtScheduleKind,
    FlowDirection,
    JarKey,
    PayoffStrategy,
    TransactionSource,
    TransactionStatus,
    type DebtKind,
    type DebtPaymentCadence,
} from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { HouseholdSettings } from '../../../../../auth/household/household-settings/household-settings.entity';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { FixedCost } from '../../plan/fixed-cost/fixed-cost.entity';
import { Category } from '../../plan/jar/category.entity';
import { Jar } from '../../plan/jar/jar.entity';

import { applyDebtBalanceDelta } from './debt-link.util';
import { Debt } from './debt.entity';

/** Seed name for DEBT_PAYMENTS category template. */
const DEBT_PAYMENTS_CATEGORY_NAME = 'Debt payments';

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
        startedOn?: string | null;
        scheduleKind?: DebtScheduleKind;
        paymentCadence?: Cadence;
        termPayments?: number | null;
        maturityOn?: string | null;
        linkFixedCost?: boolean;
    }) {
        const scheduleKind = input.scheduleKind ?? DebtScheduleKind.OPEN;
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
            startedOn: input.startedOn ?? null,
            scheduleKind,
            paymentCadence: input.paymentCadence ?? Cadence.MONTHLY,
            termPayments:
                scheduleKind === DebtScheduleKind.TERM ? (input.termPayments ?? null) : null,
            maturityOn:
                scheduleKind === DebtScheduleKind.DEADLINE ? (input.maturityOn ?? null) : null,
        } as never);
        await this.em.persist(entity).flush();

        if (input.linkFixedCost !== false) {
            await this.upsertLinkedFixedCost(entity);
            await this.em.flush();
        }

        return toDto(entity);
    }

    async recordPayment(input: {
        debtId: string;
        amount: number;
        bookedOn: string;
        note?: string | null;
    }) {
        if (input.amount <= 0) {
            throw new BadRequestException('Payment amount must be positive');
        }

        const debt = await this.repo.findOneOrFail({ id: input.debtId });
        const { jar, category } = await resolveDebtPaymentTargets(this.em);

        const outflow = -Math.abs(input.amount);
        const transaction = this.em.create(Transaction, {
            household: currentHouseholdId(),
            account: null,
            jar: jar ? this.em.getReference(Jar, jar.id) : null,
            category: category ? this.em.getReference(Category, category.id) : null,
            debt,
            amount: outflow,
            bookedOn: input.bookedOn,
            description: `Debt payment · ${debt.name}`,
            counterparty: debt.name,
            inflowKey: null,
            note: input.note ?? null,
            status: jar ? TransactionStatus.SORTED : TransactionStatus.INBOX,
            source: TransactionSource.MANUAL,
            dedupeKey: null,
        } as never);
        this.em.persist(transaction);

        applyDebtBalanceDelta(debt, outflow);
        await this.em.flush();

        return this.buildDetail(debt);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.repo.find({ closedOn: null });
        return rows.map(toDto);
    }

    async get(id: string) {
        const debt = await this.repo.findOneOrFail({ id });
        return this.buildDetail(debt);
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
        const monthlyPool = debts.reduce((total, debt) => {
            const minimum = Number(debt.minimumPayment);
            const extra = resolved === PayoffStrategy.MINIMAL ? 0 : Number(debt.extraPayment);
            return total + minimum + extra;
        }, 0);

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
            startedOn: string | null;
            scheduleKind: DebtScheduleKind;
            paymentCadence: Cadence;
            termPayments: number | null;
            maturityOn: string | null;
            linkFixedCost: boolean;
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
        if (patch.startedOn !== undefined) entity.startedOn = patch.startedOn;
        if (patch.paymentCadence !== undefined) entity.paymentCadence = patch.paymentCadence;

        if (patch.scheduleKind !== undefined) {
            entity.scheduleKind = patch.scheduleKind;
            if (patch.scheduleKind === DebtScheduleKind.OPEN) {
                entity.termPayments = null;
                entity.maturityOn = null;
            } else if (patch.scheduleKind === DebtScheduleKind.TERM) {
                entity.termPayments =
                    patch.termPayments !== undefined ? patch.termPayments : entity.termPayments;
                entity.maturityOn = null;
            } else {
                entity.maturityOn =
                    patch.maturityOn !== undefined ? patch.maturityOn : entity.maturityOn;
                entity.termPayments = null;
            }
        } else {
            if (patch.termPayments !== undefined) entity.termPayments = patch.termPayments;
            if (patch.maturityOn !== undefined) entity.maturityOn = patch.maturityOn;
        }

        const linked = await this.em.findOne(FixedCost, {
            debt: entity.id,
            household: currentHouseholdId(),
        });
        if (patch.linkFixedCost === true || linked) {
            await this.upsertLinkedFixedCost(entity);
        }

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

    // ====================================================================
    // ? INTERNAL
    // ====================================================================

    private async buildDetail(debt: Debt) {
        const payments = await this.em.find(
            Transaction,
            { debt: debt.id, household: currentHouseholdId() },
            { orderBy: { bookedOn: 'DESC' }, populate: ['account', 'jar', 'category', 'debt'] }
        );
        const linked = await this.em.findOne(
            FixedCost,
            { debt: debt.id, household: currentHouseholdId() },
            { populate: ['jar', 'category', 'debt'] }
        );

        const paidAmount = Math.max(0, Number(debt.originalBalance) - Number(debt.balance));
        const remaining = Number(debt.balance);
        const paymentsMade = payments.length;
        const paymentsRemaining =
            debt.scheduleKind === DebtScheduleKind.TERM && debt.termPayments !== null
                ? Math.max(0, debt.termPayments - paymentsMade)
                : null;

        return {
            debt: toDto(debt),
            paidAmount,
            remaining,
            paymentsMade,
            paymentsRemaining,
            payments: payments.map(toPaymentDto),
            linkedFixedCost: linked ? toLinkedFixedCostDto(linked) : null,
        };
    }

    private async upsertLinkedFixedCost(debt: Debt) {
        const { jar, category } = await resolveDebtPaymentTargets(this.em);
        if (!jar) return;

        let fixed = await this.em.findOne(FixedCost, {
            debt: debt.id,
            household: currentHouseholdId(),
        });
        if (!fixed) {
            fixed = this.em.create(FixedCost, {
                household: currentHouseholdId(),
                jar: this.em.getReference(Jar, jar.id),
                category: category ? this.em.getReference(Category, category.id) : null,
                debt,
                name: debt.name,
                counterparty: debt.name,
                amount: Number(debt.minimumPayment),
                cadence: debt.paymentCadence,
                dueDay: debt.dueDay,
                direction: FlowDirection.OUT,
                isActive: true,
                endsOn: debt.maturityOn,
                note: null,
            } as never);
            this.em.persist(fixed);
            return;
        }

        fixed.name = debt.name;
        fixed.counterparty = debt.name;
        fixed.amount = Number(debt.minimumPayment);
        fixed.cadence = debt.paymentCadence;
        fixed.dueDay = debt.dueDay;
        fixed.endsOn = debt.maturityOn;
        if (category) fixed.category = this.em.getReference(Category, category.id);
        fixed.jar = this.em.getReference(Jar, jar.id);
    }
}

async function resolveDebtPaymentTargets(em: EntityManager) {
    const jar = await em.findOne(Jar, {
        household: currentHouseholdId(),
        key: JarKey.NECESSITIES,
    });
    if (!jar) return { jar: null, category: null };

    let category = await em.findOne(Category, {
        household: currentHouseholdId(),
        jar: jar.id,
        name: DEBT_PAYMENTS_CATEGORY_NAME,
        isArchived: false,
    });
    if (!category) {
        category = em.create(Category, {
            household: currentHouseholdId(),
            jar,
            name: DEBT_PAYMENTS_CATEGORY_NAME,
            budgeted: 0,
            isArchived: false,
        } as never);
        em.persist(category);
    }
    return { jar, category };
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
        startedOn: debt.startedOn,
        scheduleKind: debt.scheduleKind,
        paymentCadence: debt.paymentCadence as DebtPaymentCadence,
        termPayments: debt.termPayments,
        maturityOn: debt.maturityOn,
    };
}

function toPaymentDto(transaction: Transaction) {
    return {
        id: transaction.id,
        householdId: transaction.household,
        accountId: transaction.account?.id ?? null,
        jarId: transaction.jar?.id ?? null,
        categoryId: transaction.category?.id ?? null,
        debtId: transaction.debt?.id ?? null,
        amount: Number(transaction.amount),
        bookedOn: transaction.bookedOn,
        description: transaction.description,
        counterparty: transaction.counterparty,
        inflowKey: transaction.inflowKey,
        status: transaction.status,
        source: transaction.source,
        appliedRuleId: transaction.appliedRuleId,
        note: transaction.note,
        createdAt: transaction.createdAt.toISOString(),
    };
}

function toLinkedFixedCostDto(fixedCost: FixedCost) {
    return {
        id: fixedCost.id,
        householdId: fixedCost.household,
        jarId: fixedCost.jar.id,
        categoryId: fixedCost.category?.id ?? null,
        debtId: fixedCost.debt?.id ?? null,
        name: fixedCost.name,
        counterparty: fixedCost.counterparty,
        amount: Number(fixedCost.amount),
        cadence: fixedCost.cadence,
        dueDay: fixedCost.dueDay,
        direction: fixedCost.direction,
        isActive: fixedCost.isActive,
        endsOn: fixedCost.endsOn,
        note: fixedCost.note,
    };
}
