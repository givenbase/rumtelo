import { EntityManager } from '@mikro-orm/postgresql';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';

import { apiBadRequest } from '../../../../../../common/errors/api-user-error';

import {
    Cadence,
    FixedCostSettlementSource,
    FixedCostSettlementStatus,
    FlowDirection,
    type JarKey,
    jarCapabilitiesFor,
} from '@rumtelo/contracts';
import { isFixedCostCounting, sumMonthlyFixedOut } from '@rumtelo/utils';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';
import { JarService } from '../jar/jar.service';
import { applyFixedCostLinkChange } from './fixed-cost-link.util';
import { FixedCost } from './fixed-cost.entity';
import { FixedCostSettlement } from './fixed-cost-settlement.entity';

@Injectable()
export class FixedCostService {
    private readonly repo: HouseholdScopedRepository<FixedCost>;
    private readonly settlements: HouseholdScopedRepository<FixedCostSettlement>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService
    ) {
        this.repo = new HouseholdScopedRepository(em, FixedCost);
        this.settlements = new HouseholdScopedRepository(em, FixedCostSettlement);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        jarId: string;
        categoryId?: string | null;
        debtId?: string | null;
        name: string;
        counterparty?: string | null;
        amount: number;
        cadence?: string;
        dueDay?: number | null;
        direction?: 'IN' | 'OUT';
        isActive?: boolean;
        endsOn?: string | null;
        note?: string | null;
    }) {
        await assertJarAllowsFixedCosts(this.em, input.jarId);
        const entity = this.em.create(FixedCost, {
            household: currentHouseholdId(),
            jar: this.em.getReference(Jar, input.jarId),
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            debt: input.debtId ? this.em.getReference(Debt, input.debtId) : null,
            name: input.name,
            counterparty: input.counterparty ?? null,
            amount: input.amount,
            cadence: (input.cadence as Cadence) ?? Cadence.MONTHLY,
            dueDay: input.dueDay ?? null,
            direction: (input.direction as FlowDirection) ?? FlowDirection.OUT,
            isActive: input.isActive ?? true,
            endsOn: input.endsOn ?? null,
            note: input.note ?? null,
        } as never);
        await this.em.persist(entity).flush();
        if (!input.categoryId) {
            await this.jars.reconcileFixedCostCategories();
            await this.em.refresh(entity, { populate: ['jar', 'category', 'debt'] });
        }
        return toDto(entity);
    }

    async markPaid(input: {
        fixedCostId: string;
        period: string;
        paidAt?: string | null;
        amount?: number | null;
        transactionId?: string | null;
        note?: string | null;
    }) {
        const fixedCost = await this.repo.findOneOrFail({ id: input.fixedCostId });
        if (!isFixedCostCounting(fixedCost)) {
            throw apiBadRequest('bill_paused_no_settlement');
        }

        if (input.transactionId) {
            const transaction = await this.em.findOneOrFail(Transaction, {
                id: input.transactionId,
                household: currentHouseholdId(),
            });
            await this.em.populate(transaction, ['fixedCost', 'debt']);
            if (transaction.debt) {
                throw new BadRequestException(
                    'Unlink the debt payment before settling a fixed cost on this transaction.'
                );
            }
            const period = transaction.bookedOn.slice(0, 7);
            if (period !== input.period) {
                throw new BadRequestException(
                    `Transaction is booked in ${period}; settle that month or pick another transaction.`
                );
            }
            await applyFixedCostLinkChange(this.em, transaction, input.fixedCostId, {
                source: FixedCostSettlementSource.MARK_PAID,
            });
            await this.em.flush();
            const settlement = await this.settlements.findOneOrFail({
                fixedCost: input.fixedCostId,
                period,
            });
            if (input.note !== undefined) settlement.note = input.note ?? null;
            if (input.paidAt) settlement.paidAt = new Date(input.paidAt);
            if (input.amount !== undefined && input.amount !== null) {
                settlement.amount = input.amount;
            }
            await this.em.flush();
            return toSettlementDto(settlement);
        }

        let settlement = await this.settlements.findOne({
            fixedCost: input.fixedCostId,
            period: input.period,
        });

        const paidAt = input.paidAt ? new Date(input.paidAt) : new Date();
        const amount = input.amount ?? fixedCost.amount;

        if (settlement) {
            settlement.status = FixedCostSettlementStatus.PAID;
            if (!settlement.transaction) {
                settlement.source = FixedCostSettlementSource.MARK_PAID;
            }
            settlement.paidAt = paidAt;
            settlement.amount = amount;
            if (input.note !== undefined) settlement.note = input.note ?? null;
        } else {
            settlement = this.em.create(FixedCostSettlement, {
                household: currentHouseholdId(),
                fixedCost: this.em.getReference(FixedCost, input.fixedCostId),
                period: input.period,
                status: FixedCostSettlementStatus.PAID,
                source: FixedCostSettlementSource.MARK_PAID,
                paidAt,
                amount,
                transaction: null,
                note: input.note ?? null,
            } as never);
            this.em.persist(settlement);
        }

        await this.em.flush();
        return toSettlementDto(settlement);
    }

    async skip(input: { fixedCostId: string; period: string; note?: string | null }) {
        const fixedCost = await this.repo.findOneOrFail({ id: input.fixedCostId });
        if (!isFixedCostCounting(fixedCost)) {
            throw apiBadRequest('bill_paused_no_settlement');
        }

        let settlement = await this.settlements.findOne({
            fixedCost: input.fixedCostId,
            period: input.period,
        });
        if (settlement) {
            await this.em.populate(settlement, ['transaction']);
        }

        if (settlement?.transaction) {
            settlement.transaction.fixedCost = null;
            settlement.transaction = null;
        }

        if (settlement) {
            settlement.status = FixedCostSettlementStatus.SKIPPED;
            settlement.source = FixedCostSettlementSource.SKIP;
            settlement.paidAt = null;
            settlement.amount = null;
            if (input.note !== undefined) settlement.note = input.note ?? null;
        } else {
            settlement = this.em.create(FixedCostSettlement, {
                household: currentHouseholdId(),
                fixedCost: this.em.getReference(FixedCost, input.fixedCostId),
                period: input.period,
                status: FixedCostSettlementStatus.SKIPPED,
                source: FixedCostSettlementSource.SKIP,
                paidAt: null,
                amount: null,
                transaction: null,
                note: input.note ?? null,
            } as never);
            this.em.persist(settlement);
        }

        await this.em.flush();
        return toSettlementDto(settlement);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list(direction?: 'IN' | 'OUT' | null) {
        const rows = await this.repo.find((direction ? { direction } : {}) as never);
        return rows.map(toDto);
    }

    /** Grouped by jar so the UI can show what each jar already owes before spending. */
    async byJar() {
        const rows = await this.repo.find({}, { orderBy: { name: 'ASC' } });
        await this.em.populate(rows, ['jar']);
        const groups = new Map<
            string,
            { jarKey: JarKey; jarName: string; items: ReturnType<typeof toDto>[] }
        >();
        for (const row of rows) {
            const jarId = row.jar.id;
            const existing = groups.get(jarId);
            if (existing) {
                existing.items.push(toDto(row));
            } else {
                groups.set(jarId, {
                    jarKey: row.jar.key,
                    jarName: row.jar.name,
                    items: [toDto(row)],
                });
            }
        }
        return [...groups.entries()].map(([jarId, group]) => ({
            jarId,
            jarKey: group.jarKey,
            jarName: group.jarName,
            /** Monthly-normalised active OUT only — matches jar committedOut. */
            total: sumMonthlyFixedOut(group.items, { activeOnly: true }),
            items: group.items,
        }));
    }

    async listSettlements(filter: { fixedCostId?: string | null; period?: string | null }) {
        const where: Record<string, unknown> = {};
        if (filter.fixedCostId) where.fixedCost = filter.fixedCostId;
        if (filter.period) where.period = filter.period;
        const rows = await this.settlements.find(where, {
            orderBy: { period: 'DESC' },
        });
        await this.em.populate(rows, ['fixedCost', 'transaction']);
        return rows.map(toSettlementDto);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            jarId: string;
            categoryId: string | null;
            debtId: string | null;
            name: string;
            counterparty: string | null;
            amount: number;
            cadence: string;
            dueDay: number | null;
            direction: 'IN' | 'OUT';
            isActive: boolean;
            endsOn: string | null;
            note: string | null;
        }>
    ) {
        const entity = await this.repo.findOneOrFail({ id });
        if (patch.jarId !== undefined) {
            await assertJarAllowsFixedCosts(this.em, patch.jarId);
            entity.jar = this.em.getReference(Jar, patch.jarId);
        }
        if (patch.categoryId !== undefined) {
            entity.category = patch.categoryId
                ? this.em.getReference(Category, patch.categoryId)
                : null;
        }
        if (patch.debtId !== undefined) {
            entity.debt = patch.debtId ? this.em.getReference(Debt, patch.debtId) : null;
        }
        if (patch.name !== undefined) entity.name = patch.name;
        if (patch.counterparty !== undefined) entity.counterparty = patch.counterparty;
        if (patch.amount !== undefined) entity.amount = patch.amount;
        if (patch.cadence !== undefined) entity.cadence = patch.cadence as Cadence;
        if (patch.dueDay !== undefined) entity.dueDay = patch.dueDay;
        if (patch.direction !== undefined) entity.direction = patch.direction as FlowDirection;
        if (patch.isActive !== undefined) entity.isActive = patch.isActive;
        if (patch.endsOn !== undefined) entity.endsOn = patch.endsOn;
        if (patch.note !== undefined) entity.note = patch.note;
        await this.em.flush();
        if (entity.category === null) {
            await this.jars.reconcileFixedCostCategories();
            await this.em.refresh(entity, { populate: ['jar', 'category', 'debt'] });
        }
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

    async unlinkSettlement(id: string) {
        const settlement = await this.settlements.findOneOrFail({ id });
        await this.em.populate(settlement, ['transaction', 'fixedCost']);
        if (settlement.transaction) {
            settlement.transaction.fixedCost = null;
            settlement.transaction = null;
        }
        await this.em.remove(settlement).flush();
        return { ok: true as const };
    }
}

async function assertJarAllowsFixedCosts(em: EntityManager, jarId: string) {
    const jar = await em.findOneOrFail(Jar, jarId);
    if (!jarCapabilitiesFor(jar.key).allowsFixedCosts) {
        throw new BadRequestException(
            'Recurring bills belong on Necessities, Play, Education, or Give — not Financial Freedom or Long-term savings.'
        );
    }
}

export function toDto(fixedCost: FixedCost) {
    return {
        id: fixedCost.id,
        householdId: fixedCost.household,
        jarId: fixedCost.jar.id,
        categoryId: fixedCost.category?.id ?? null,
        debtId: fixedCost.debt?.id ?? null,
        name: fixedCost.name,
        counterparty: fixedCost.counterparty,
        amount: fixedCost.amount,
        cadence: fixedCost.cadence,
        dueDay: fixedCost.dueDay,
        direction: fixedCost.direction,
        isActive: fixedCost.isActive,
        endsOn: fixedCost.endsOn,
        note: fixedCost.note,
    };
}

export function toSettlementDto(settlement: FixedCostSettlement) {
    return {
        id: settlement.id,
        householdId: settlement.household,
        fixedCostId: settlement.fixedCost.id,
        period: settlement.period,
        status: settlement.status,
        source: settlement.source,
        paidAt: settlement.paidAt?.toISOString() ?? null,
        amount: settlement.amount,
        transactionId: settlement.transaction?.id ?? null,
        note: settlement.note,
    };
}
