import { Inject, Injectable } from '@nestjs/common';

import { PayoffStrategy, type JarKey } from '@rumtelo/contracts';
import {
    endOfPeriodIso,
    jarCoverage,
    projectDebtsAtHorizon,
    projectGoalsAtHorizon,
    stackPlannedAllocations,
    toPeriodKey,
    travelForPeriod,
} from '@rumtelo/utils';

import { sum } from '../../../../../common/utils/money.util';
import { daysInPeriod } from '../../../../../common/utils/period.util';
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

        let jars = baselineJars;
        if (meta.travel.direction === 'future') {
            jars = scaleJarsForHorizon(baselineJars, horizon, period, { zeroLedger: true });
        } else if (meta.travel.direction === 'past') {
            const [range, spentByCategory] = await Promise.all([
                this.jars.spentCreditedByJarBetween(period, currentKey),
                this.jars.spentByCategoryBetween(period, currentKey),
            ]);
            jars = scaleJarsForHorizon(baselineJars, horizon, period, {
                spentByJar: range.spent,
                creditedByJar: range.credited,
                spentByCategory,
            });
        }

        const allocatedTotal = sum(jars.map(jar => jar.allocated));
        const spentTotal = sum(jars.map(jar => jar.spent));
        const jarsOnTrack = jars.filter(jar => !jar.overspent).length;
        const fixedCostsMonthly = sum(byJar.map(group => group.total));

        // Monthly safe-to-spend: use baseline (current) jars, not stacked envelopes.
        const safeSource = baselineJars;
        const daysLeft =
            meta.travel.direction === 'current'
                ? Math.max(1, daysInPeriod(period) - new Date().getUTCDate())
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
                            other.status === 'ACTIVE'
                    )
                    .reduce((total, other) => total + other.monthlyContribution, 0);
                return {
                    id: goal.id,
                    name: goal.name,
                    jarKey: (jar?.key as string | undefined) ?? null,
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
            jarKey: (goal.jarKey as JarKey | null) ?? null,
            saved: goal.saved,
            target: goal.target,
            projectedSaved: goal.projectedSaved,
            fulfilledByPeriod: goal.fulfilledByPeriod,
            monthsToFulfill: goal.monthsToFulfill,
            incomeNeededCents: goal.incomeNeededCents,
        }));

        const strategy =
            (settings.money?.payoffStrategy as PayoffStrategy | undefined) ??
            debtPlan.strategy ??
            PayoffStrategy.AVALANCHE;
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

        // Keep avgLeftOver / playLeft monthly (baseline), not stacked.
        const avgLeftOver = sum(baselineJars.map(jar => jar.available));
        const playLeft = baselineJars.find(jar => jar.key === 'PLAY')?.available ?? 0;

        return {
            period,
            periodLabel: formatPeriod(period),
            allocatedTotal,
            incomeTotal: stackedMode ? income * horizon : income,
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
            baselineAllocatedTotal: stackedMode ? baselineAllocatedTotal : null,
            baselineJars: stackedMode
                ? baselineJars.map(jar => ({ id: jar.id, allocated: jar.allocated }))
                : null,
            /** Built on the client from travel + jar params — see buildPeriodTravelCoachText. */
            travelCoachText: null,
        };
    }
}

type ScaleOptions = {
    zeroLedger?: boolean;
    spentByJar?: Map<string, number>;
    creditedByJar?: Map<string, number>;
    spentByCategory?: Map<string, number>;
};

function scaleJarsForHorizon(
    baseline: Awaited<ReturnType<JarService['balances']>>,
    horizon: number,
    period: string,
    options: ScaleOptions
) {
    const shares = baseline.map(jar => ({ id: jar.id, percentage: jar.percentage }));
    const monthlyNet = sum(baseline.map(jar => jar.allocated));
    const stacked = stackPlannedAllocations({ monthlyNet, shares, horizon });
    const allocatedById = new Map(stacked.stacked.map(row => [row.id, row.amount]));

    return baseline.map(jar => {
        const allocated = allocatedById.get(jar.id) ?? jar.allocated * horizon;
        const spent = options.zeroLedger ? 0 : (options.spentByJar?.get(jar.id) ?? 0);
        const credited = options.zeroLedger ? 0 : (options.creditedByJar?.get(jar.id) ?? 0);
        const committedOut = jar.committedOut * horizon;
        const coverage = jarCoverage({ allocated, spent, credited, committedOut });
        return {
            ...jar,
            period,
            allocated,
            spent,
            credited,
            committedOut,
            remaining: coverage.remaining,
            available: coverage.available,
            progress: coverage.progress,
            overspent: coverage.overspent,
            categories: jar.categories.map(category => ({
                ...category,
                budgeted: category.budgeted * horizon,
                actual: options.zeroLedger
                    ? 0
                    : (options.spentByCategory?.get(category.id) ?? category.actual * horizon),
            })),
        };
    });
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
