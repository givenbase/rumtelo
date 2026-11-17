import {
    CAPABILITIES,
    HouseholdAccessSource,
    WeekCheckStage,
    hasCapability,
} from '@rumtelo/contracts';
import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { PlanAccessService } from '../../../../../common/capability';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import {
    currentHouseholdContext,
    currentHouseholdId,
} from '../../../../../common/household/household.context';
import { Jar } from '../plan/jar/jar.entity';
import { MoneyWeekCheck } from './money-week-check.entity';
import { WeekCheckAllocation } from './week-check-allocation.entity';

@Injectable()
export class WeekCheckService {
    private readonly weekChecks: HouseholdScopedRepository<MoneyWeekCheck>;
    private readonly allocations: HouseholdScopedRepository<WeekCheckAllocation>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService
    ) {
        this.weekChecks = new HouseholdScopedRepository(em, MoneyWeekCheck);
        this.allocations = new HouseholdScopedRepository(em, WeekCheckAllocation);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /**
     * Created lazily: opening the week-check screen is what starts the week's check.
     * Only a writable seat starts it; a VIEWER or a Practice preview reads without
     * creating a row (an unstarted check comes back as a blank LOOK-stage summary).
     */
    async current(week: string) {
        let weekCheck = await this.weekChecks.findOne({ week });
        if (!weekCheck && !canWriteBoard()) {
            return this.toDto(null, await this.courseApplies(), week);
        }
        if (!weekCheck) {
            weekCheck = this.em.create(MoneyWeekCheck, {
                household: currentHouseholdId(),
                week,
            } as never);
            await this.em.persist(weekCheck).flush();
        }
        return this.toDto(weekCheck, await this.courseApplies());
    }

    /** Weeks among `weeks` whose money check is complete. Read-only: never creates a row. */
    async completedWeeks(weeks: readonly string[]): Promise<Set<string>> {
        if (weeks.length === 0) return new Set();
        const rows = await this.weekChecks.find({ week: { $in: [...weeks] } });
        return new Set(rows.filter(row => row.completedAt).map(row => row.week));
    }

    /**
     * Facts for Home's first-run layout. Read-only: never creates a row. `week` is the
     * current ISO week; `hasCompleted` looks at all time.
     */
    async completionFacts(week: string): Promise<{ hasCompleted: boolean; doneThisWeek: boolean }> {
        const [anyCompleted, thisWeek] = await Promise.all([
            this.weekChecks.find({ completedAt: { $ne: null } }, { limit: 1 }),
            this.weekChecks.findOne({ week }),
        ]);
        return {
            hasCompleted: anyCompleted.length > 0,
            doneThisWeek: Boolean(thisWeek?.completedAt),
        };
    }

    async history() {
        const rows = await this.weekChecks.find({}, { orderBy: { week: 'DESC' }, limit: 26 });
        const courseApplies = await this.courseApplies();
        return Promise.all(rows.map(weekCheck => this.toDto(weekCheck, courseApplies)));
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
        // Idempotent: completing twice (a retry after a failed follow-up call) keeps the first time.
        if (input.stage === WeekCheckStage.DONE && !weekCheck.completedAt) {
            weekCheck.completedAt = new Date();
        }
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
        return this.toDto(weekCheck, await this.courseApplies());
    }

    // Private

    /** `weekCheck` null = a read-only caller opened a week that was never started. */
    private async toDto(
        weekCheck: MoneyWeekCheck | null,
        courseApplies: boolean,
        week = weekCheck?.week ?? ''
    ) {
        if (!weekCheck) {
            return {
                id: NOT_STARTED_ID,
                householdId: currentHouseholdId(),
                week,
                stage: WeekCheckStage.LOOK,
                surplus: 0,
                allocations: [],
                intention: null,
                completedAt: null,
                courseApplies,
            };
        }
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
            courseApplies,
        };
    }

    /**
     * Do the Course stages follow the Money stages for this caller? Plan decides what
     * exists (`growthCourse`); role decides who may act (Growth is closed to VIEWER and
     * to a Practice preview).
     */
    private async courseApplies(): Promise<boolean> {
        if (!canWriteBoard()) return false;
        const planKey = await this.planAccess.planKeyForCurrentHousehold();
        return hasCapability(CAPABILITIES.growthCourse, planKey);
    }
}

/** Placeholder id of a week check nobody has started (never stored). */
const NOT_STARTED_ID = '00000000-0000-0000-0000-000000000000';

/** OWNER / MEMBER on their own seat. A VIEWER or a Practice preview only reads. */
function canWriteBoard(): boolean {
    const ctx = currentHouseholdContext();
    return ctx.source === HouseholdAccessSource.SEAT && ctx.role !== 'VIEWER';
}
