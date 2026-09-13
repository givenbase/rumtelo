import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { Cadence, FlowDirection } from '@rumtelo/contracts';
import { sumMonthlyFixedOut } from '@rumtelo/utils';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { Category } from '../jar/category.entity';
import { Jar } from '../jar/jar.entity';
import { JarService } from '../jar/jar.service';
import { FixedCost } from './fixed-cost.entity';

@Injectable()
export class FixedCostService {
    private readonly repo: HouseholdScopedRepository<FixedCost>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService
    ) {
        this.repo = new HouseholdScopedRepository(em, FixedCost);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        jarId: string;
        categoryId?: string | null;
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
        const entity = this.em.create(FixedCost, {
            household: currentHouseholdId(),
            jar: this.em.getReference(Jar, input.jarId),
            category: input.categoryId ? this.em.getReference(Category, input.categoryId) : null,
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
            await this.em.refresh(entity, { populate: ['jar', 'category'] });
        }
        return toDto(entity);
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
            { jarKey: string; jarName: string; items: ReturnType<typeof toDto>[] }
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

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            jarId: string;
            categoryId: string | null;
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
        if (patch.jarId !== undefined) entity.jar = this.em.getReference(Jar, patch.jarId);
        if (patch.categoryId !== undefined) {
            entity.category = patch.categoryId
                ? this.em.getReference(Category, patch.categoryId)
                : null;
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
            await this.em.refresh(entity, { populate: ['jar', 'category'] });
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
}

export function toDto(fixedCost: FixedCost) {
    return {
        id: fixedCost.id,
        householdId: fixedCost.household,
        jarId: fixedCost.jar.id,
        categoryId: fixedCost.category?.id ?? null,
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
