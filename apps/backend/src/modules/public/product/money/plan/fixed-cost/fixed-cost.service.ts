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
import { isFixedCostCounting, normalizeDueMonth, sumMonthlyFixedOut } from '@rumtelo/utils';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Transaction } from '../../ledger/transaction/transaction.entity';
import { Debt } from '../../targets/debt/debt.entity';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';
import { JarService } from '../jar/jar.service';
import { type CounterpartyPatch, PartyService } from '../party/party.service';
import { assertPeriodOpen } from '../../month-score/period-lock.util';
import { applyFixedCostLinkChange } from './fixed-cost-link.util';
import { FixedCost } from './fixed-cost.entity';
import { FixedCostSettlement } from './fixed-cost-settlement.entity';

@Injectable()
export class FixedCostService {
    private readonly repo: HouseholdScopedRepository<FixedCost>;
    private readonly settlements: HouseholdScopedRepository<FixedCostSettlement>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(PartyService) private readonly parties: PartyService
    ) {
        this.repo = new HouseholdScopedRepository(em, FixedCost);
        this.settlements = new HouseholdScopedRepository(em, FixedCostSettlement);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(
        input: CounterpartyPatch & {
            jarId: string;
            categoryId?: string | null;
            debtId?: string | null;
            name: string;
            amount: number;
            cadence?: string;
            dueDay?: number | null;
            dueMonth?: number | null;
            direction?: 'IN' | 'OUT';
            isActive?: boolean;
            startedOn?: string | null;
            endsOn?: string | null;
            note?: string | null;
            presetKey?: string | null;
        }
    ) {
        await assertJarAllowsFixedCosts(this.em, input.jarId);
        const cadence = (input.cadence as Cadence) ?? Cadence.MONTHLY;
        const dueMonth = normalizeDueMonth(input.dueMonth, cadence);
        assertDueMonthForCadence(cadence, dueMonth);
        const other = await this.parties.resolveCounterparty(input);
        const entity = this.em.create(FixedCost, {
            household: currentHouseholdId(),
            jar: this.em.getReference(Jar, input.jarId),
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
            debt: input.debtId ? this.em.getReference(Debt, input.debtId) : null,
            name: input.name,
            presetKey: input.presetKey ?? null,
            counterparty: other.counterparty,
            merchantKey: other.merchantKey,
            party: other.party,
            amount: input.amount,
            cadence,
            dueDay: input.dueDay ?? null,
            dueMonth,
            direction: (input.direction as FlowDirection) ?? FlowDirection.OUT,
            isActive: input.isActive ?? true,
            startedOn: input.startedOn ?? null,
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
        await assertPeriodOpen(this.em, input.period);

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
        await assertPeriodOpen(this.em, input.period);

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
            /** Monthly-normalised OUT as-of today — matches jar committedOut. */
            total: sumMonthlyFixedOut(group.items, {
                asOf: new Date().toISOString().slice(0, 10),
            }),
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
        patch: CounterpartyPatch &
            Partial<{
                jarId: string;
                categoryId: string | null;
                debtId: string | null;
                name: string;
                amount: number;
                cadence: string;
                dueDay: number | null;
                dueMonth: number | null;
                direction: 'IN' | 'OUT';
                isActive: boolean;
                startedOn: string | null;
                endsOn: string | null;
                note: string | null;
                presetKey: string | null;
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
        if (patch.presetKey !== undefined) entity.presetKey = patch.presetKey;
        if (
            patch.counterparty !== undefined ||
            patch.merchantKey !== undefined ||
            patch.partyId !== undefined ||
            patch.saveParty
        ) {
            const other = await this.parties.resolveCounterparty(patch, entity);
            entity.counterparty = other.counterparty;
            entity.merchantKey = other.merchantKey;
            entity.party = other.party;
        }
        if (patch.amount !== undefined) entity.amount = patch.amount;
        if (patch.cadence !== undefined) entity.cadence = patch.cadence as Cadence;
        if (patch.dueDay !== undefined) entity.dueDay = patch.dueDay;
        if (patch.dueMonth !== undefined) entity.dueMonth = patch.dueMonth;
        if (patch.direction !== undefined) entity.direction = patch.direction as FlowDirection;
        if (patch.isActive !== undefined) entity.isActive = patch.isActive;
        if (patch.startedOn !== undefined) entity.startedOn = patch.startedOn;
        if (patch.endsOn !== undefined) entity.endsOn = patch.endsOn;
        if (patch.note !== undefined) entity.note = patch.note;
        entity.dueMonth = normalizeDueMonth(entity.dueMonth, entity.cadence);
        assertDueMonthForCadence(entity.cadence, entity.dueMonth);
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
        await assertPeriodOpen(this.em, settlement.period);
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

function assertDueMonthForCadence(cadence: Cadence, dueMonth: number | null) {
    if (cadence !== Cadence.QUARTERLY && cadence !== Cadence.YEARLY) return;
    if (dueMonth === null) throw apiBadRequest('due_month_required');
}

export function toDto(fixedCost: FixedCost) {
    return {
        id: fixedCost.id,
        householdId: fixedCost.household,
        jarId: fixedCost.jar.id,
        categoryId: fixedCost.category?.id ?? null,
        debtId: fixedCost.debt?.id ?? null,
        name: fixedCost.name,
        presetKey: fixedCost.presetKey,
        counterparty: fixedCost.counterparty,
        merchantKey: fixedCost.merchantKey,
        partyId: fixedCost.party,
        amount: fixedCost.amount,
        cadence: fixedCost.cadence,
        dueDay: fixedCost.dueDay,
        dueMonth: fixedCost.dueMonth,
        direction: fixedCost.direction,
        isActive: fixedCost.isActive,
        startedOn: fixedCost.startedOn,
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
