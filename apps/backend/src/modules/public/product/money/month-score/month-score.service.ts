import { EntityManager } from '@mikro-orm/postgresql';
import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_CURRENCY, formatMoney } from '@rumtelo/utils';

import { HouseholdScopedRepository } from '../../../../../common/household/household-scoped.repository';
import { currentHouseholdId } from '../../../../../common/household/household.context';
import { sum } from '../../../../../common/utils/money.util';
import { daysInPeriod } from '../../../../../common/utils/period.util';
import { HouseholdSettings } from '../../../../auth/household/household-settings/household-settings.entity';
import { JarService } from '../plan/jar/jar.service';
import { MonthScore } from './month-score.entity';
import { MonthScoreEvent } from './month-score-event.entity';

/** Level thresholds are cumulative score. Labels follow the product's steering language. */
export const LEVELS = [
    { index: 1, label: 'Beginner', threshold: 0, unlocks: ['Zes potten', 'Inbox'] },
    { index: 2, label: 'Navigator', threshold: 120, unlocks: ['Week check'] },
    { index: 3, label: 'Stuurman', threshold: 320, unlocks: ['Doelen', 'Schulden'] },
    { index: 4, label: 'Kapitein', threshold: 640, unlocks: ['Energie-laag'] },
    { index: 5, label: 'Kompas', threshold: 1080, unlocks: ['Coach', 'Export'] },
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
        const events = await this.events.find({ period }, { orderBy: { day: 'DESC' } });
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
            levelLabel: level.label,
            events: events.map(event => ({
                id: event.id,
                householdId: event.household,
                period: event.period,
                kind: event.kind,
                day: event.day,
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
        const settings = await this.em.findOne(HouseholdSettings, {
            household: currentHouseholdId(),
        });
        const currency = settings?.currency ?? DEFAULT_CURRENCY;

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
        const headline =
            availableTotal >= 0
                ? `${formatMoney(availableTotal, { currency, locale: 'nl-NL' })} over deze periode`
                : 'Eén of meer potten zijn overschreden';

        return {
            period,
            income,
            allocated,
            spent,
            leftOver: availableTotal,
            score,
            bestJar: best?.name ?? null,
            worstJar: worst?.overspent ? worst.name : null,
            headline,
        };
    }
}

export function levelFor(score: number) {
    return [...LEVELS].reverse().find(level => score >= level.threshold) ?? LEVELS[0]!;
}
