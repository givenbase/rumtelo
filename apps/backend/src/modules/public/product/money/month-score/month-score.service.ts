import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import {
    FixedCostSettlementSource,
    FixedCostSettlementStatus,
    type MonthCloseBillDisposition,
    type MonthScoreUnlockKey,
} from '@rumtelo/contracts';

import { apiBadRequest } from '../../../../../common/errors/api-user-error';
import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { sum } from '../../../../../common/utils/money.util';
import { daysUntilPeriodEnd } from '../../../../../common/utils/period.util';
import { FixedCost } from '../plan/fixed-cost/fixed-cost.entity';
import { FixedCostSettlement } from '../plan/fixed-cost/fixed-cost-settlement.entity';
import { JarService } from '../plan/jar/jar.service';
import { closeBlockersReady, collectCloseBlockers } from './close-blockers.util';
import { MonthScore } from './month-score.entity';
import { MonthScoreEvent } from './month-score-event.entity';
import { findPriorOpenPeriod } from './prior-open-period.util';

/** Level thresholds are cumulative score. Display labels and unlock copy live in client i18n. */
export const LEVELS: {
    index: number;
    threshold: number;
    unlocks: MonthScoreUnlockKey[];
}[] = [
    { index: 1, threshold: 0, unlocks: ['six_jars', 'inbox'] },
    { index: 2, threshold: 120, unlocks: ['week_check'] },
    { index: 3, threshold: 320, unlocks: ['goals', 'debts'] },
    { index: 4, threshold: 640, unlocks: ['energy_layer'] },
    { index: 5, threshold: 1080, unlocks: ['coach', 'export'] },
];

@Injectable()
export class MonthScoreService {
    private readonly scores: HouseholdScopedRepository<MonthScore>;
    private readonly events: HouseholdScopedRepository<MonthScoreEvent>;
    private readonly settlements: HouseholdScopedRepository<FixedCostSettlement>;

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService
    ) {
        this.scores = new HouseholdScopedRepository(em, MonthScore);
        this.events = new HouseholdScopedRepository(em, MonthScoreEvent);
        this.settlements = new HouseholdScopedRepository(em, FixedCostSettlement);
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async current(period: string) {
        const monthScore = await this.scores.findOne({ period });
        const events = monthScore
            ? await this.events.find(
                  { monthScore: monthScore.id },
                  { orderBy: { occurredOn: 'DESC', createdAt: 'DESC' } }
              )
            : [];
        const score = monthScore?.score ?? 0;
        const level = levelFor(score);
        const isClosed = monthScore?.isClosed ?? false;
        const closeBlockers = isClosed ? null : await collectCloseBlockers(this.em, period);
        const priorOpenPeriod = isClosed ? null : await findPriorOpenPeriod(this.em, period);

        return {
            householdId: currentHouseholdId(),
            period,
            score,
            maxScore: monthScore?.maxScore ?? 100,
            daysLeft: daysUntilPeriodEnd(period),
            isClosed,
            level: level.index,
            events: events.map(event => ({
                id: event.id,
                householdId: event.household,
                period,
                kind: event.kind,
                occurredOn: event.occurredOn,
                text: event.text,
                points: event.points,
            })),
            closeBlockers,
            priorOpenPeriod,
        };
    }

    levels() {
        return LEVELS;
    }

    async recap(period: string) {
        const monthScore = await this.scores.findOne({ period });
        return this.buildRecap(period, monthScore);
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Idempotent: closing an already-closed month score returns the existing recap. */
    async close(period: string, billDispositions: MonthCloseBillDisposition[] = []) {
        let monthScore = await this.scores.findOne({ period });
        if (monthScore?.isClosed) {
            return this.buildRecap(period, monthScore);
        }

        const priorOpenPeriod = await findPriorOpenPeriod(this.em, period);
        if (priorOpenPeriod) {
            throw apiBadRequest('month_close_prior_open', { period: priorOpenPeriod });
        }

        let blockers = await collectCloseBlockers(this.em, period);
        if (blockers.inboxCount > 0) {
            throw apiBadRequest('month_close_incomplete', {
                inbox: blockers.inboxCount,
                bills: blockers.dueBillCount,
            });
        }

        if (blockers.dueBillCount > 0) {
            await this.applyBillDispositions(period, blockers.dueBills, billDispositions);
            blockers = await collectCloseBlockers(this.em, period);
        }

        if (!closeBlockersReady(blockers)) {
            throw apiBadRequest('month_close_incomplete', {
                inbox: blockers.inboxCount,
                bills: blockers.dueBillCount,
            });
        }

        const recap = await this.buildRecap(period, monthScore);

        if (!monthScore) {
            monthScore = this.em.create(MonthScore, {
                household: currentHouseholdId(),
                period,
            } as never);
            this.em.persist(monthScore);
        }

        monthScore.score = recap.score;
        monthScore.maxScore = 100;
        monthScore.isClosed = true;
        monthScore.closedAt = new Date();
        monthScore.level = levelFor(recap.score).index;

        await this.em.flush();
        return recap;
    }

    // Private

    private async applyBillDispositions(
        period: string,
        dueBills: { fixedCostId: string; name: string; amount: number; arrearsMonths: number }[],
        dispositions: MonthCloseBillDisposition[]
    ) {
        const byId = new Map(dispositions.map(row => [row.fixedCostId, row.action]));
        for (const bill of dueBills) {
            if (!byId.has(bill.fixedCostId)) {
                throw apiBadRequest('month_close_bill_disposition', { name: bill.name });
            }
        }
        for (const disposition of dispositions) {
            if (!dueBills.some(bill => bill.fixedCostId === disposition.fixedCostId)) {
                throw apiBadRequest('month_close_bill_disposition', {
                    name: disposition.fixedCostId,
                });
            }
        }

        for (const bill of dueBills) {
            const action = byId.get(bill.fixedCostId)!;
            if (action === 'skip') {
                await this.upsertSettlement(bill.fixedCostId, period, {
                    status: FixedCostSettlementStatus.SKIPPED,
                    source: FixedCostSettlementSource.SKIP,
                });
                continue;
            }

            await this.upsertSettlement(bill.fixedCostId, period, {
                status: FixedCostSettlementStatus.ROLLED,
                source: FixedCostSettlementSource.ROLL,
            });
        }

        await this.em.flush();
    }

    private async upsertSettlement(
        fixedCostId: string,
        period: string,
        values: {
            status: FixedCostSettlementStatus;
            source: FixedCostSettlementSource;
        }
    ) {
        let settlement = await this.settlements.findOne({ fixedCost: fixedCostId, period });
        if (settlement) {
            await this.em.populate(settlement, ['transaction']);
            if (settlement.transaction) {
                settlement.transaction.fixedCost = null;
                settlement.transaction = null;
            }
            settlement.status = values.status;
            settlement.source = values.source;
            settlement.paidAt = null;
            settlement.amount = null;
            settlement.clearedByPeriod = null;
            return settlement;
        }

        settlement = this.em.create(FixedCostSettlement, {
            household: currentHouseholdId(),
            fixedCost: this.em.getReference(FixedCost, fixedCostId),
            period,
            status: values.status,
            source: values.source,
            paidAt: null,
            amount: null,
            transaction: null,
            note: null,
            clearedByPeriod: null,
        } as never);
        this.em.persist(settlement);
        return settlement;
    }

    private async buildRecap(period: string, monthScore?: MonthScore | null) {
        const jarRows = await this.jars.balances(period);
        const income = await this.jars.monthlyNetIncome();
        const allocated = sum(jarRows.map(jar => jar.allocated));
        const spent = sum(jarRows.map(jar => jar.spent));

        const spendable = jarRows.filter(jar => jar.capabilities?.canSpend);
        const held = spendable.filter(jar => !jar.overspent).length;
        const score =
            monthScore?.score ??
            (spendable.length ? Math.round((held / spendable.length) * 100) : 0);

        const best = jarRows.reduce(
            (left, right) => (left.available >= right.available ? left : right),
            jarRows[0]!
        );
        const worst =
            jarRows.find(jar => jar.overspent) ??
            jarRows.reduce(
                (left, right) => (left.available <= right.available ? left : right),
                jarRows[0]!
            );

        const availableTotal = sum(jarRows.map(jar => jar.available));
        const headlineKey = availableTotal >= 0 ? ('surplus' as const) : ('overspent' as const);

        return {
            period,
            income,
            allocated,
            spent,
            leftOver: availableTotal,
            score,
            bestJar: best?.name ?? null,
            worstJar: worst?.overspent ? worst.name : null,
            headlineKey,
        };
    }
}

export function levelFor(score: number) {
    return [...LEVELS].reverse().find(level => score >= level.threshold) ?? LEVELS[0]!;
}
