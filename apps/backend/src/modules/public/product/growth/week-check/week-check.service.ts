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

    /** Weeks among `weeks` whose check is complete. Read-only: never creates a row. */
    async completedWeeks(weeks: readonly string[]): Promise<Set<string>> {
        if (weeks.length === 0) return new Set();
        const rows = await this.weekChecks.find({ week: { $in: [...weeks] } });
        return new Set(rows.filter(row => row.completedAt).map(row => row.week));
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
