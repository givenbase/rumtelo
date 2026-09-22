import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable, Logger } from '@nestjs/common';

import { apiBadRequest } from '../../../../../../common/errors/api-user-error';
import { CAPABILITIES, type GivingCause, GoalKind, GoalStatus } from '@rumtelo/contracts';
import { earnGoalProgress } from '@rumtelo/utils';

import { PlanAccessService } from '../../../../../../common/capability';
import { HouseholdScopedRepository } from '../../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { TransactionService } from '../../ledger/transaction/transaction.service';
import { Jar } from '../../plan/jar/jar.entity';
import { JarService } from '../../plan/jar/jar.service';

import { Goal } from './goal.entity';

function todayIso(): string {
    return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class GoalService {
    private readonly logger = new Logger(GoalService.name);
    private readonly repo: HouseholdScopedRepository<Goal>;
    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(PlanAccessService) private readonly planAccess: PlanAccessService,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(TransactionService) private readonly transactions: TransactionService
    ) {
        this.repo = new HouseholdScopedRepository(em, Goal);
    }

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    async create(input: {
        kind?: string;
        jarId?: string | null;
        name: string;
        icon?: string | null;
        target: number;
        monthlyContribution?: number;
        targetOn?: string | null;
        status?: string;
        why?: string | null;
        cause?: string | null;
        givingOrganisationKey?: string | null;
    }) {
        await this.planAccess.assertCapability(CAPABILITIES.growthGoals);
        const occupied = await this.repo.count({ status: GoalStatus.ACTIVE });
        await this.planAccess.assertWithinLimit('maxGoals', occupied);

        const kind = (input.kind as GoalKind) ?? GoalKind.SAVE;
        const isGive = kind === GoalKind.GIVE;
        const isSave = kind === GoalKind.SAVE;
        const jarId = kind === GoalKind.EARN ? null : (input.jarId ?? null);
        const sortOrder = isSave && jarId ? await this.nextSortOrder(jarId) : 0;

        const entity = this.em.create(Goal, {
            household: currentHouseholdId(),
            kind,
            jar: jarId ? this.em.getReference(Jar, jarId) : null,
            name: input.name,
            icon: input.icon ?? null,
            target: input.target,
            saved: 0,
            monthlyContribution: kind === GoalKind.EARN ? 0 : (input.monthlyContribution ?? 0),
            sortOrder,
            // A pledge without a date is a pledge for this calendar year.
            targetOn: input.targetOn ?? (isGive ? endOfYearIso() : null),
            fulfilledOn: null,
            status: (input.status as GoalStatus) ?? GoalStatus.ACTIVE,
            why: input.why ?? null,
            cause: isGive ? ((input.cause as GivingCause | null | undefined) ?? null) : null,
            givingOrganisationKey: isGive ? input.givingOrganisationKey?.trim() || null : null,
        } as never);
        await this.em.persist(entity).flush();
        if (kind === GoalKind.EARN) {
            await this.evaluateEarnGoals();
            await this.em.refresh(entity);
        }
        if (kind === GoalKind.GIVE) {
            await this.evaluateGiveGoals();
            await this.em.refresh(entity);
        }
        return toDto(entity);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async list() {
        await this.evaluateEarnGoals();
        await this.safeEvaluateGiveGoals();
        const rows = await this.repo.find(
            { status: { $in: [GoalStatus.ACTIVE, GoalStatus.REACHED] } },
            { orderBy: { sortOrder: 'ASC' } }
        );
        return rows.map(toDto);
    }

    /**
     * Straight-line projection at the current contribution rate (SAVE, GIVE);
     * EARN uses net progress. GIVE `saved` is refreshed from the ledger first.
     */
    async projections() {
        await this.evaluateEarnGoals();
        await this.safeEvaluateGiveGoals();
        const rows = await this.repo.find({ status: GoalStatus.ACTIVE });
        const net = await this.jars.monthlyNetIncome();

        return rows.map(goal => {
            if (goal.kind === GoalKind.EARN) {
                const progress = earnGoalProgress({
                    target: goal.target,
                    currentNet: net,
                });
                return {
                    goalId: goal.id,
                    projectedDate: null,
                    monthsRemaining: null,
                    onTrack: progress.reached || progress.current > 0,
                    shortfallPerMonth: progress.remaining,
                };
            }

            const remaining = goal.target - goal.saved;
            const monthly = goal.monthlyContribution;
            const months = monthly > 0 ? Math.ceil(remaining / monthly) : null;

            const projectedDate = months === null ? null : addMonths(new Date(), months);
            const onTrack =
                goal.targetOn === null || projectedDate === null
                    ? monthly > 0
                    : projectedDate <= goal.targetOn;

            const shortfall =
                goal.targetOn && monthly >= 0
                    ? Math.max(
                          0,
                          Math.ceil(remaining / Math.max(1, monthsUntil(goal.targetOn))) - monthly
                      )
                    : 0;

            return {
                goalId: goal.id,
                projectedDate,
                monthsRemaining: months,
                onTrack,
                shortfallPerMonth: shortfall,
            };
        });
    }

    /**
     * Mark ACTIVE EARN goals REACHED when household monthly net >= target.
     * Idempotent — safe to call from income writes and goal list.
     */
    async evaluateEarnGoals(): Promise<void> {
        const earnGoals = await this.repo.find({
            kind: GoalKind.EARN,
            status: GoalStatus.ACTIVE,
        });
        if (earnGoals.length === 0) return;

        const net = await this.jars.monthlyNetIncome();
        let changed = false;
        for (const goal of earnGoals) {
            if (earnGoalProgress({ target: goal.target, currentNet: net }).reached) {
                goal.status = GoalStatus.REACHED;
                goal.fulfilledOn = todayIso();
                changed = true;
            }
        }
        if (changed) await this.em.flush();
    }

    /**
     * A GIVE goal is a pledge: `saved` = sorted money that left its jar inside the
     * pledge window (the year ending on `targetOn`). Reached when it meets the target.
     * Idempotent — safe to call from goal reads.
     */
    async evaluateGiveGoals(): Promise<void> {
        const giveGoals = await this.repo.find({
            kind: GoalKind.GIVE,
            status: GoalStatus.ACTIVE,
        });
        if (giveGoals.length === 0) return;
        await this.em.populate(giveGoals, ['jar']);

        const householdId = currentHouseholdId();
        const totals = await Promise.all(
            giveGoals.map(async goal => {
                if (!goal.jar) return null;
                const { start, end } = pledgeWindow(goal.targetOn);
                const rows = await this.em.getConnection().execute<{ total: string }[]>(
                    `SELECT COALESCE(SUM(-amount), 0)::text AS total
                       FROM money_transaction
                      WHERE household_id = ? AND status = 'SORTED' AND amount < 0
                        AND jar_id = ? AND booked_on >= ? AND booked_on <= ?`,
                    [householdId, goal.jar.id, start, end]
                );
                return Number(rows[0]?.total ?? 0);
            })
        );

        let changed = false;
        for (const [index, goal] of giveGoals.entries()) {
            const given = totals[index];
            if (given === null || given === undefined) continue;
            if (given !== goal.saved) {
                goal.saved = given;
                changed = true;
            }
            if (given >= goal.target) {
                goal.status = GoalStatus.REACHED;
                goal.fulfilledOn = todayIso();
                changed = true;
            }
        }
        if (changed) await this.em.flush();
    }

    /**
     * Give evaluation must not take down goal list / growth dashboard when the
     * `GIVE` enum value is missing (migration Migration20260912200000_Giving).
     */
    private async safeEvaluateGiveGoals(): Promise<void> {
        try {
            await this.evaluateGiveGoals();
        } catch (error) {
            this.logger.warn(
                `Skipping GIVE goal evaluation — apply Migration20260912200000_Giving if money_goal_kind lacks GIVE. ${
                    error instanceof Error ? error.message : String(error)
                }`
            );
        }
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    async update(
        id: string,
        patch: Partial<{
            kind: string;
            jarId: string | null;
            name: string;
            icon: string | null;
            target: number;
            saved: number;
            monthlyContribution: number;
            targetOn: string | null;
            status: string;
            why: string | null;
            fulfilledOn: string | null;
            cause: string | null;
            givingOrganisationKey: string | null;
            sortOrder: number;
        }>
    ) {
        const entity = await this.repo.findOneOrFail({ id });
        if (patch.kind !== undefined) entity.kind = patch.kind as GoalKind;
        if (patch.jarId !== undefined) {
            entity.jar =
                entity.kind === GoalKind.EARN
                    ? null
                    : patch.jarId
                      ? this.em.getReference(Jar, patch.jarId)
                      : null;
        }
        if (patch.name !== undefined) entity.name = patch.name;
        if (patch.icon !== undefined) entity.icon = patch.icon;
        if (patch.target !== undefined) entity.target = patch.target;
        if (patch.saved !== undefined) entity.saved = patch.saved;
        if (patch.monthlyContribution !== undefined) {
            entity.monthlyContribution =
                entity.kind === GoalKind.EARN ? 0 : patch.monthlyContribution;
        }
        if (patch.targetOn !== undefined) entity.targetOn = patch.targetOn;
        if (patch.status !== undefined) entity.status = patch.status as GoalStatus;
        if (patch.why !== undefined) entity.why = patch.why;
        if (patch.fulfilledOn !== undefined) entity.fulfilledOn = patch.fulfilledOn;
        if (patch.sortOrder !== undefined && entity.kind === GoalKind.SAVE) {
            entity.sortOrder = patch.sortOrder;
        }
        if (patch.cause !== undefined) {
            entity.cause =
                entity.kind === GoalKind.GIVE
                    ? ((patch.cause as GivingCause | null) ?? null)
                    : null;
        }
        if (patch.givingOrganisationKey !== undefined) {
            entity.givingOrganisationKey =
                entity.kind === GoalKind.GIVE ? patch.givingOrganisationKey?.trim() || null : null;
        }
        if (entity.kind === GoalKind.EARN) {
            entity.jar = null;
            entity.monthlyContribution = 0;
            entity.cause = null;
            entity.givingOrganisationKey = null;
            entity.sortOrder = 0;
        }
        if (entity.kind === GoalKind.SAVE) {
            entity.cause = null;
            entity.givingOrganisationKey = null;
        }
        if (entity.kind === GoalKind.GIVE) {
            entity.sortOrder = 0;
        }
        await this.em.flush();
        if (entity.kind === GoalKind.EARN && entity.status === GoalStatus.ACTIVE) {
            await this.evaluateEarnGoals();
            await this.em.refresh(entity);
        }
        if (entity.kind === GoalKind.GIVE && entity.status === GoalStatus.ACTIVE) {
            await this.evaluateGiveGoals();
            await this.em.refresh(entity);
        }
        return toDto(entity);
    }

    /** Promote a SAVE goal to #1 focus on its jar. */
    async setFocus(id: string) {
        const entity = await this.repo.findOneOrFail({ id });
        await this.em.populate(entity, ['jar']);
        if (entity.kind !== GoalKind.SAVE) {
            throw apiBadRequest('goal_save_only_jar_focus');
        }
        if (!entity.jar) {
            throw apiBadRequest('goal_save_needs_jar_focus');
        }
        if (entity.status !== GoalStatus.ACTIVE) {
            throw apiBadRequest('goal_only_active_focus');
        }
        await this.reindexJarFocus(entity.jar.id, entity.id);
        await this.em.refresh(entity);
        return toDto(entity);
    }

    /**
     * Mark SAVE goal reached. `spend` books an Out from the jar for the target;
     * `keep` leaves the cash available in the jar.
     */
    async achieve(id: string, mode: 'keep' | 'spend') {
        const entity = await this.repo.findOneOrFail({ id });
        await this.em.populate(entity, ['jar']);
        if (entity.kind !== GoalKind.SAVE) {
            throw apiBadRequest('goal_save_only_achieved');
        }
        if (entity.status === GoalStatus.REACHED) {
            return toDto(entity);
        }
        if (entity.status !== GoalStatus.ACTIVE) {
            throw apiBadRequest('goal_not_active');
        }
        const jarId = entity.jar?.id ?? null;
        const target = entity.target;

        if (mode === 'spend') {
            if (!jarId) {
                throw apiBadRequest('goal_no_jar_spend');
            }
            await this.transactions.create({
                jarId,
                amount: -Math.abs(target),
                bookedOn: todayIso(),
                description: `Achieved: ${entity.name}`,
                note: 'Goal claimed from jar',
            });
        }

        entity.status = GoalStatus.REACHED;
        entity.fulfilledOn = todayIso();
        entity.saved = target;
        await this.em.flush();

        if (jarId) {
            await this.reindexJarFocus(jarId, null);
        }
        await this.em.refresh(entity);
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

    /** Next sortOrder for a new SAVE goal on this jar (append after focus queue). */
    private async nextSortOrder(jarId: string): Promise<number> {
        const rows = await this.repo.find(
            { kind: GoalKind.SAVE, jar: jarId, status: GoalStatus.ACTIVE },
            { orderBy: { sortOrder: 'DESC' }, limit: 1 }
        );
        return (rows[0]?.sortOrder ?? -1) + 1;
    }

    /**
     * Reindex ACTIVE SAVE goals on a jar: focusId becomes 0, others 1..n in prior order.
     * When focusId is null, keep relative order starting at 0 (after a claim).
     */
    private async reindexJarFocus(jarId: string, focusId: string | null) {
        const siblings = await this.repo.find(
            { kind: GoalKind.SAVE, jar: jarId, status: GoalStatus.ACTIVE },
            { orderBy: { sortOrder: 'ASC' } }
        );
        const ordered =
            focusId === null
                ? siblings
                : [
                      ...siblings.filter(row => row.id === focusId),
                      ...siblings.filter(row => row.id !== focusId),
                  ];
        ordered.forEach((row, index) => {
            row.sortOrder = index;
        });
        await this.em.flush();
    }
}

function addMonths(from: Date, months: number): string {
    const date = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + months, 1));
    return date.toISOString().slice(0, 10);
}

function endOfYearIso(): string {
    return `${new Date().getUTCFullYear()}-12-31`;
}

/**
 * The year that ends on `targetOn` (inclusive); calendar year when unset.
 * Pledges are yearly by doctrine — a monthly pledge is a fixed cost, not a goal.
 */
function pledgeWindow(targetOn: string | null): { start: string; end: string } {
    if (!targetOn) {
        const year = new Date().getUTCFullYear();
        return { start: `${year}-01-01`, end: `${year}-12-31` };
    }
    const end = new Date(targetOn);
    const start = new Date(
        Date.UTC(end.getUTCFullYear() - 1, end.getUTCMonth(), end.getUTCDate() + 1)
    );
    return { start: start.toISOString().slice(0, 10), end: targetOn };
}

function monthsUntil(isoDate: string): number {
    const target = new Date(isoDate);
    const now = new Date();
    return Math.max(
        1,
        (target.getUTCFullYear() - now.getUTCFullYear()) * 12 +
            (target.getUTCMonth() - now.getUTCMonth())
    );
}

export function toDto(goal: Goal) {
    return {
        id: goal.id,
        householdId: goal.household,
        kind: goal.kind,
        jarId: goal.jar?.id ?? null,
        name: goal.name,
        icon: goal.icon,
        target: goal.target,
        saved: goal.saved,
        monthlyContribution: goal.monthlyContribution,
        targetOn: goal.targetOn,
        status: goal.status,
        why: goal.why,
        cause: goal.cause ?? null,
        givingOrganisationKey: goal.givingOrganisationKey ?? null,
        fulfilledOn: goal.fulfilledOn,
        sortOrder: goal.sortOrder ?? 0,
    };
}
