import { Module } from '@nestjs/common';

import { ArchiveModule } from './archive/archive.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { LedgerModule } from './ledger/ledger.module';
import { MonthScoreModule } from './month-score/month-score.module';
import { PlanModule } from './plan/plan.module';
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
        DashboardModule,
    ],
    exports: [
        PlanModule,
        LedgerModule,
        TargetsModule,
        ArchiveModule,
        MonthScoreModule,
        WeekCheckModule,
        DashboardModule,
    ],
})
export class MoneyModule {}
