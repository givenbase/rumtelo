import { Module } from '@nestjs/common';

import { ArchiveModule } from './archive/archive.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LedgerModule } from './ledger/ledger.module';
import { MonthScoreModule } from './month-score/month-score.module';
import { PlanModule } from './plan/plan.module';
import { ProgressModule } from './progress/progress.module';
import { TargetsModule } from './targets/targets.module';
import { WeekCheckModule } from './week-check/week-check.module';

/**
 * Product: Geld. Children are grouped by sub-domain:
 *
 *   plan/         the split setup — jars, income, fixed costs
 *   ledger/       the bank reality — accounts, transactions, sorting rules
 *   targets/      what the household steers toward — goals up, debts down
 *   archive/      JSON export restore across plan / ledger / targets
 *   month-score/  monthly close — points, level, event log
 *   week-check/   weekly ten-minute practice and surplus allocations
 *   progress/     board stage (SPLIT → MONTH), derived on read from the above
 *   dashboard/    the composition layer reading across all of the above
 */
@Module({
    imports: [
        PlanModule,
        LedgerModule,
        TargetsModule,
        ArchiveModule,
        MonthScoreModule,
        WeekCheckModule,
        ProgressModule,
        DashboardModule,
    ],
    exports: [
        PlanModule,
        LedgerModule,
        TargetsModule,
        ArchiveModule,
        MonthScoreModule,
        WeekCheckModule,
        ProgressModule,
        DashboardModule,
    ],
})
export class MoneyModule {}
