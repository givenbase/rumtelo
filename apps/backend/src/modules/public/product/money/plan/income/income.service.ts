import { EntityManager } from '@mikro-orm/postgresql';
import { forwardRef, Inject, Injectable } from '@nestjs/common';

import { Cadence, type IncomeKind } from '@rumtelo/contracts';

import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { splitByPercentage } from '../../../../../../common/utils/money.util';
import { GoalService } from '../../targets/goal/goal.service';
import { JarService } from '../jar/jar.service';
import { IncomeAmountPeriod } from './income-amount-period.entity';
import { IncomeSource } from './income-source.entity';

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

function sortPeriodsNewestFirst(periods: IncomeAmountPeriod[]): IncomeAmountPeriod[] {
    return [...periods].sort((left, right) => right.effectiveOn.localeCompare(left.effectiveOn));
}

@Injectable()
export class IncomeService {
    private readonly sources: HouseholdScopedRepository<IncomeSource>;
    private readonly periods: HouseholdScopedRepository<IncomeAmountPeriod>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(forwardRef(() => GoalService)) private readonly goals: GoalService
    ) {
        this.sources = new HouseholdScopedRepository(em, IncomeSource);
        this.periods = new HouseholdScopedRepository(em, IncomeAmountPeriod);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        name: string;
        kind: string;
        amount: number;
        cadence?: string;
        expectedDay?: number | null;
        isActive?: boolean;
        startedOn?: string | null;
    }) {
        const effectiveOn = input.startedOn ?? todayIso();
        const source = this.em.create(IncomeSource, {
            household: currentHouseholdId(),
            name: input.name,
            kind: input.kind as IncomeKind,
            amount: input.amount,
            cadence: (input.cadence as Cadence) ?? Cadence.MONTHLY,
            expectedDay: input.expectedDay ?? null,
            isActive: input.isActive ?? true,
            startedOn: input.startedOn ?? null,
        } as never);
        const period = this.em.create(IncomeAmountPeriod, {
            household: currentHouseholdId(),
            incomeSource: source,
            amount: input.amount,
            effectiveOn,
        } as never);
        this.em.persist([source, period]);
        await this.em.flush();
        await this.goals.evaluateEarnGoals();
        return this.toDtoWithPeriods(source);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        const rows = await this.sources.find();
        const periods = await this.periods.find();
        const bySource = new Map<string, IncomeAmountPeriod[]>();
        for (const period of periods) {
            const sourceId = period.incomeSource.id;
            const list = bySource.get(sourceId) ?? [];
            list.push(period);
            bySource.set(sourceId, list);
        }
        for (const [sourceId, list] of bySource) {
            bySource.set(sourceId, sortPeriodsNewestFirst(list));
        }
        return Promise.all(
            rows.map(source => this.toDtoWithPeriods(source, bySource.get(source.id) ?? []))
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            name: string;
            kind: string;
            amount: number;
            cadence: string;
            expectedDay: number | null;
            isActive: boolean;
            startedOn: string | null;
            amountEffectiveFrom: string | null;
        }>
    ) {
        const source = await this.sources.findOneOrFail({ id });
        if (patch.name !== undefined) source.name = patch.name;
        if (patch.kind !== undefined) source.kind = patch.kind as IncomeKind;
        if (patch.cadence !== undefined) source.cadence = patch.cadence as Cadence;
        if (patch.expectedDay !== undefined) source.expectedDay = patch.expectedDay;
        if (patch.isActive !== undefined) source.isActive = patch.isActive;
        if (patch.startedOn !== undefined) source.startedOn = patch.startedOn;

        let amountChanged = false;
        if (patch.amount !== undefined && source.amount !== patch.amount) {
            const effectiveOn = patch.amountEffectiveFrom?.slice(0, 10) || todayIso();
            // UNIQUE(incomeSource, effectiveOn): a second change on the same day
            // overwrites that day's figure instead of adding a duplicate row.
            const sameDay = await this.em.findOne(IncomeAmountPeriod, {
                incomeSource: source.id,
                effectiveOn,
            });
            if (sameDay) {
                sameDay.amount = patch.amount;
            } else {
                this.em.persist(
                    this.em.create(IncomeAmountPeriod, {
                        household: currentHouseholdId(),
                        incomeSource: source,
                        amount: patch.amount,
                        effectiveOn,
                    } as never)
                );
            }
            source.amount = patch.amount;
            amountChanged = true;
        }

        await this.em.flush();
        if (amountChanged) {
            await this.goals.evaluateEarnGoals();
        }
        return this.toDtoWithPeriods(source);
    }

    /**
     * The core money movement: income arrives and is split across jars in the same
     * moment. Uses splitByPercentage so no cent is lost to rounding.
     */
    async applySplit(amount: number) {
        const jars = await this.jars.list();
        const allocations = splitByPercentage(
            amount,
            jars.map(jar => ({ id: jar.id, percentage: jar.percentage }))
        );
        // TODO: persist allocations as ledger rows once the allocation table lands.
        return {
            allocations: allocations.map(allocation => ({
                jarId: allocation.id,
                amount: allocation.amount,
            })),
        };
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    async remove(id: string) {
        const source = await this.sources.findOneOrFail({ id });
        await this.em.remove(source).flush();
        return { ok: true as const };
    }

    private async toDtoWithPeriods(source: IncomeSource, periods?: IncomeAmountPeriod[]) {
        const rows = sortPeriodsNewestFirst(
            periods ?? (await this.periods.find({ incomeSource: source.id }))
        );
        return {
            id: source.id,
            householdId: source.household,
            name: source.name,
            kind: source.kind,
            amount: source.amount,
            cadence: source.cadence,
            expectedDay: source.expectedDay,
            isActive: source.isActive,
            startedOn: source.startedOn,
            periods: rows.map(period => ({
                id: period.id,
                amount: period.amount,
                effectiveOn: period.effectiveOn,
            })),
        };
    }
}
