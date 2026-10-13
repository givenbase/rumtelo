import { Inject, Injectable } from '@nestjs/common';

import { GoalStatus, JarKey, PayoffStrategy } from '@rumtelo/contracts';
import {
    endOfPeriodIso,
    projectDebtsAtHorizon,
    projectGoalsAtHorizon,
    toPeriodKey,
    travelForPeriod,
} from '@rumtelo/utils';

import { sum } from '../../../../../common/utils/money.util';
import { daysInPeriod, daysUntilPeriodEnd } from '../../../../../common/utils/period.util';
import { CoachService } from '../../../platform/coach/coach.service';
import { HouseholdSettingsService } from '../../../../auth/household/household-settings/household-settings.service';
import { TransactionService } from '../ledger/transaction/transaction.service';
import { FixedCostService } from '../plan/fixed-cost/fixed-cost.service';
import { JarService } from '../plan/jar/jar.service';
import { DebtService } from '../targets/debt/debt.service';
import { GoalService } from '../targets/goal/goal.service';
import { MonthScoreService } from '../month-score/month-score.service';

/**
 * Composition root for the dashboard. The design puts jars, coach, month score and four
 * headline figures on one screen; fetching those separately would create a request
 * waterfall on the most-visited route in the product, so they are assembled here.
 *
 * When PERIOD travels, jar totals stack and goals/debts are projected so Looking Ahead /
 * Looking Back stay honest — see `@rumtelo/utils` period-stack helpers.
 */
@Injectable()
export class DashboardService {
    constructor(
        @Inject(JarService) private readonly jars: JarService,
        @Inject(MonthScoreService) private readonly monthScores: MonthScoreService,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(TransactionService) private readonly transactions: TransactionService,
        @Inject(HouseholdSettingsService)
        private readonly householdSettings: HouseholdSettingsService,
        @Inject(FixedCostService) private readonly fixedCosts: FixedCostService,
        @Inject(DebtService) private readonly debts: DebtService,
        @Inject(GoalService) private readonly goals: GoalService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async get(householdId: string, period: string) {
        const meta = travelForPeriod(period);
        const currentKey = toPeriodKey(meta.current.year, meta.current.month);

        const [
            baselineJars,
            monthScore,
            coach,
            inboxCount,
            income,
            settings,
            byJar,
            debtPlan,
            debtList,
            goalList,
        ] = await Promise.all([
            this.jars.balances(currentKey),
            this.monthScores.current(period),
            this.coach.feed(period),
            this.transactions.countInbox(),
            this.jars.monthlyNetIncome(),
            this.householdSettings.get(householdId),
            this.fixedCosts.byJar(),
            this.debts.plan(),
            this.debts.list(),
            this.goals.list(),
        ]);

        const horizon = meta.horizon;
        const stackedMode = meta.mode === 'stacked';

        // Looking Ahead / Back: `jars.balances` stacks pot + plan (future) or snapshots (past).
        const jars =
            meta.travel.direction === 'current' ? baselineJars : await this.jars.balances(period);

        const allocatedTotal = sum(jars.map(jar => jar.allocated));
        const spentTotal = sum(jars.map(jar => jar.spent));
        const jarsOnTrack = jars.filter(jar => !jar.overspent).length;
        const fixedCostsMonthly = sum(byJar.map(group => group.total));

        // Safe-to-spend / leftovers: live month for current + Looking Ahead; selected month when Looking Back.
        const lookingBack = meta.travel.direction === 'past';
        const safeSource = lookingBack ? jars : baselineJars;
        const daysLeft =
            meta.travel.direction === 'current'
                ? Math.max(1, daysUntilPeriodEnd(period))
                : daysInPeriod(period);
        const spendableRemaining = sum(
            safeSource
                .filter(jar => jar.capabilities?.countsTowardSafeToSpend)
                .map(jar => Math.max(0, jar.available))
        );

        const jarById = new Map(baselineJars.map(jar => [jar.id, jar]));
        const projectedGoals = projectGoalsAtHorizon({
            monthsDelta: meta.travel.monthsDelta,
            direction: meta.travel.direction,
            selectedPeriodEndIso: endOfPeriodIso(period),
            goals: goalList.map(goal => {
                const jar = goal.jarId ? jarById.get(goal.jarId) : undefined;
                const siblings = goalList
                    .filter(
                        other =>
                            other.id !== goal.id &&
                            other.jarId &&
                            other.jarId === goal.jarId &&
                            other.status === GoalStatus.ACTIVE
                    )
                    .reduce((total, other) => total + other.monthlyContribution, 0);
                return {
                    id: goal.id,
                    name: goal.name,
                    jarKey: jar?.key ?? null,
                    jarId: goal.jarId,
                    kind: goal.kind,
                    status: goal.status,
                    saved: goal.saved,
                    target: goal.target,
                    monthlyContribution: goal.monthlyContribution,
                    targetOn: goal.targetOn,
                    fulfilledOn: goal.fulfilledOn,
                    jarPercentage: jar?.percentage ?? null,
                    jarFixedCents: jar?.committedOut ?? 0,
                    siblingPlannedCents: siblings,
                };
            }),
        });
        const goalsAtPeriod = projectedGoals.map(goal => ({
            goalId: goal.goalId,
            name: goal.name,
            jarKey: goal.jarKey,
            saved: goal.saved,
            target: goal.target,
            projectedSaved: goal.projectedSaved,
            fulfilledByPeriod: goal.fulfilledByPeriod,
            monthsToFulfill: goal.monthsToFulfill,
            incomeNeededCents: goal.incomeNeededCents,
        }));

        const strategy =
            settings.money?.payoffStrategy ?? debtPlan.strategy ?? PayoffStrategy.AVALANCHE;
        const extraMonthly = debtList.reduce((total, debt) => total + (debt.extraPayment ?? 0), 0);
        const debtsAtPeriod = projectDebtsAtHorizon({
            debts: debtList.map(debt => ({
                balance: debt.balance,
                interestRate: debt.interestRate,
                minimumPayment: debt.minimumPayment,
            })),
            monthsDelta: meta.travel.monthsDelta,
            direction: meta.travel.direction,
            strategy,
            extraMonthly: strategy === PayoffStrategy.MINIMAL ? 0 : extraMonthly,
        });

        const baselineAllocatedTotal = sum(baselineJars.map(jar => jar.allocated));
        /** Live month figures for current→selected deltas (Looking Ahead stack or Looking Back income shift). */
        const showBaselineDelta = stackedMode || lookingBack;

        // Leftovers / Play: selected month when Looking Back; otherwise live month (not stacked).
        const leftoverSource = lookingBack ? jars : baselineJars;
        const avgLeftOver = sum(leftoverSource.map(jar => jar.available));
        const playLeft = leftoverSource.find(jar => jar.key === JarKey.PLAY)?.available ?? 0;

        return {
            period,
            periodLabel: formatPeriod(period),
            allocatedTotal,
            incomeTotal: stackedMode ? income * horizon : lookingBack ? allocatedTotal : income,
            spentTotal,
            avgLeftOver,
            safePerDay: Math.floor(spendableRemaining / Math.max(1, daysLeft)),
            playLeft,
            inboxCount,
            jarsOnTrack,
            jarsTotal: jars.length,
            fixedCostsMonthly,
            debtFreeOn: debtPlan.debtFreeOn,
            debtMonthsRemaining: debtPlan.monthsRemaining,
            jars,
            coach,
            monthScore,
            why: settings.why ?? null,
            travel: {
                direction: meta.travel.direction,
                monthsHorizon: horizon,
                mode: meta.mode,
                relativeLabel: meta.travel.relativeLabel,
                daysLabel: meta.travel.daysLabel,
            },
            goalsAtPeriod,
            debtsAtPeriod: debtList.length > 0 ? debtsAtPeriod : null,
            baselineAllocatedTotal: showBaselineDelta ? baselineAllocatedTotal : null,
            baselineJars: showBaselineDelta
                ? baselineJars.map(jar => ({ id: jar.id, allocated: jar.allocated }))
                : null,
            /** Built on the client from travel + jar params — see buildPeriodTravelCoachText. */
            travelCoachText: null,
        };
    }
}

/**
 * Month names come from Intl rather than a hardcoded table: the product ships
 * NL and EN, and a lookup array would need maintaining per locale.
 * Prefer client `formatPeriod(period, locale)` for display — dashboard UI no
 * longer reads this field; kept on the wire for API consumers.
 */
function formatPeriod(period: string, locale = 'nl-NL'): string {
    const [year, month] = period.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, 1))
    );
}
