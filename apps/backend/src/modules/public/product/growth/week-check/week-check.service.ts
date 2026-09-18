import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { GrowthWeekCheck } from './growth-week-check.entity';

@Injectable()
export class GrowthWeekCheckService {
    private readonly weekChecks: HouseholdScopedRepository<GrowthWeekCheck>;

    constructor(@Inject(EntityManager) private readonly em: EntityManager) {
        this.weekChecks = new HouseholdScopedRepository(em, GrowthWeekCheck);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Created lazily: opening the week-check screen is what starts the week's check. */
    async current(week: string) {
        let weekCheck = await this.weekChecks.findOne({ week });
        if (!weekCheck) {
            weekCheck = this.em.create(GrowthWeekCheck, {
                household: currentHouseholdId(),
                week,
            } as never);
            await this.em.persist(weekCheck).flush();
        }
        return this.toDto(weekCheck);
    }

    async history() {
        const rows = await this.weekChecks.find({}, { orderBy: { week: 'DESC' }, limit: 26 });
        return rows.map(weekCheck => this.toDto(weekCheck));
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async complete(week: string) {
        let weekCheck = await this.weekChecks.findOne({ week });
        if (!weekCheck) {
            weekCheck = this.em.create(GrowthWeekCheck, {
                household: currentHouseholdId(),
                week,
            } as never);
            await this.em.persist(weekCheck).flush();
        }
        weekCheck.completedAt = new Date();
        await this.em.flush();
        return this.toDto(weekCheck);
    }

    // Private

    private toDto(weekCheck: GrowthWeekCheck) {
        return {
            id: weekCheck.id,
            householdId: weekCheck.household,
            week: weekCheck.week,
            completedAt: weekCheck.completedAt?.toISOString() ?? null,
        };
    }
}
