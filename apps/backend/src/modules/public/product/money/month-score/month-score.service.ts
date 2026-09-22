import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { sum } from '../../../../../common/utils/money.util';
import { daysInPeriod } from '../../../../../common/utils/period.util';
import { JarService } from '../plan/jar/jar.service';
import { MonthScore } from './month-score.entity';
import { MonthScoreEvent } from './month-score-event.entity';

import type { MonthScoreUnlockKey } from '@rumtelo/contracts';

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

    constructor(
        @Inject(EntityManager) private readonly em: EntityManager,
        @Inject(JarService) private readonly jars: JarService
    ) {
        this.scores = new HouseholdScopedRepository(em, MonthScore);
        this.events = new HouseholdScopedRepository(em, MonthScoreEvent);
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

        return {
            householdId: currentHouseholdId(),
            period,
            score,
            maxScore: monthScore?.maxScore ?? 100,
            daysLeft: Math.max(0, daysInPeriod(period) - new Date().getUTCDate()),
            isClosed: monthScore?.isClosed ?? false,
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
    async close(period: string) {
        let monthScore = await this.scores.findOne({ period });
        if (monthScore?.isClosed) {
            return this.buildRecap(period, monthScore);
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
