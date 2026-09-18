import { WeekCheckStage } from '@rumtelo/contracts';
import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { Jar } from '../plan/jar/jar.entity';
import { MoneyWeekCheck } from './money-week-check.entity';
import { WeekCheckAllocation } from './week-check-allocation.entity';

@Injectable()
export class WeekCheckService {
    private readonly weekChecks: HouseholdScopedRepository<MoneyWeekCheck>;
    private readonly allocations: HouseholdScopedRepository<WeekCheckAllocation>;

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.weekChecks = new HouseholdScopedRepository(em, MoneyWeekCheck);
        this.allocations = new HouseholdScopedRepository(em, WeekCheckAllocation);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Created lazily: opening the week-check screen is what starts the week's check. */
    async current(week: string) {
        let weekCheck = await this.weekChecks.findOne({ week });
        if (!weekCheck) {
            weekCheck = this.em.create(MoneyWeekCheck, {
                household: currentHouseholdId(),
                week,
            } as never);
            await this.em.persist(weekCheck).flush();
        }
        return this.toDto(weekCheck);
    }

    async history() {
        const rows = await this.weekChecks.find({}, { orderBy: { week: 'DESC' }, limit: 26 });
        return Promise.all(rows.map(weekCheck => this.toDto(weekCheck)));
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async advance(input: {
        week: string;
        stage: WeekCheckStage;
        allocations?: { jarId: string; amount: number }[];
        intention?: string;
    }) {
        let weekCheck = await this.weekChecks.findOne({ week: input.week });
        if (!weekCheck) {
            weekCheck = this.em.create(MoneyWeekCheck, {
                household: currentHouseholdId(),
                week: input.week,
            } as never);
            await this.em.persist(weekCheck).flush();
        }

        weekCheck.stage = input.stage;
        if (input.intention !== undefined) weekCheck.intention = input.intention;
        if (input.stage === WeekCheckStage.DONE) weekCheck.completedAt = new Date();
        if (input.allocations?.length) {
            weekCheck.surplus = input.allocations.reduce(
                (sum, allocation) => sum + allocation.amount,
                0
            );
            await this.em.nativeDelete(WeekCheckAllocation, { weekCheck: weekCheck.id });
            for (const allocation of input.allocations) {
                this.em.create(WeekCheckAllocation, {
                    household: currentHouseholdId(),
                    weekCheck,
                    jar: this.em.getReference(Jar, allocation.jarId),
                    amount: allocation.amount,
                } as never);
            }
        }

        await this.em.flush();
        return this.toDto(weekCheck);
    }

    // Private

    private async toDto(weekCheck: MoneyWeekCheck) {
        const allocations = await this.allocations.find({ weekCheck: weekCheck.id });
        return {
            id: weekCheck.id,
            householdId: weekCheck.household,
            week: weekCheck.week,
            stage: weekCheck.stage,
            surplus: weekCheck.surplus,
            allocations: allocations.map(allocation => ({
                jarId: allocation.jar.id,
                amount: allocation.amount,
            })),
            intention: weekCheck.intention,
            completedAt: weekCheck.completedAt?.toISOString() ?? null,
        };
    }
}
