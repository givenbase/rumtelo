import { GoalStatus, LearnProgressStatus, netWorthCents } from '@rumtelo/contracts';
import { Inject, Injectable } from '@nestjs/common';

import { currentPeriod } from '../../../../../common/utils/period.util';
import { CoachService } from '../../../platform/coach/coach.service';
import { JarService } from '../../money/plan/jar/jar.service';
import { DebtService } from '../../money/targets/debt/debt.service';
import { GoalService } from '../../money/targets/goal/goal.service';
import { AssetService } from '../asset/asset.service';
import { ProgressService } from '../learn/progress/progress.service';

/**
 * Growth portal hub composition. Goals and income live under money aggregates;
 * learn from the shelf; net worth = holdings + LTS/Freedom jars − open debts.
 */
@Injectable()
export class GrowthDashboardService {
    constructor(
        @Inject(GoalService) private readonly goals: GoalService,
        @Inject(JarService) private readonly jars: JarService,
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(AssetService) private readonly assets: AssetService,
        @Inject(DebtService) private readonly debts: DebtService,
        @Inject(ProgressService) private readonly learn: ProgressService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    async get() {
        const period = currentPeriod();
        const [goalRows, incomeMonthly, coach, holdings, openDebts, jarBalances, shelf] =
            await Promise.all([
                this.goals.list(),
                this.jars.monthlyNetIncome(),
                this.coach.feed(period),
                this.assets.list(),
                this.debts.list(),
                this.jars.balances(period),
                this.learn.list(),
            ]);

        const active = goalRows.filter(goal => goal.status === GoalStatus.ACTIVE);
        const goalsProgressPct =
            active.length === 0
                ? 0
                : Math.round(
                      active.reduce((sum, goal) => {
                          if (goal.target <= 0) return sum;
                          return sum + Math.min(100, (goal.saved / goal.target) * 100);
                      }, 0) / active.length
                  );

        const learnQueued = shelf.progress.filter(
            row =>
                row.status === LearnProgressStatus.NOW || row.status === LearnProgressStatus.QUEUE
        ).length;
        const learnDone = shelf.progress.filter(
            row => row.status === LearnProgressStatus.DONE
        ).length;
        const learnPicked = learnQueued + learnDone;
        const learnProgressPct =
            learnPicked === 0 ? 0 : Math.round((learnDone / learnPicked) * 100);

        return {
            goalsActive: active.length,
            goalsTotal: goalRows.length,
            goalsProgressPct,
            incomeMonthly,
            learnQueued,
            learnProgressPct,
            netWorth: netWorthCents({
                assets: holdings,
                jars: jarBalances,
                debts: openDebts,
            }),
            coach,
        };
    }
}
