import { Module } from '@nestjs/common';

import { HouseholdSettingsModule } from '../../../../auth/household/household-settings/household-settings.module';
import { AccountModule } from '../../../../auth/user/account/account.module';
import { CoachModule } from '../../../platform/coach/coach.module';
import { TransactionModule } from '../ledger/transaction/transaction.module';
import { FixedCostModule } from '../plan/fixed-cost/fixed-cost.module';
import { JarModule } from '../plan/jar/jar.module';
import { DebtModule } from '../targets/debt/debt.module';
import { GoalModule } from '../targets/goal/goal.module';
import { MonthScoreModule } from '../month-score/month-score.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { MoneyCoachService } from './money-coach.service';

/** Depends on the aggregates it composes rather than reaching into their tables. */
@Module({
    imports: [
        AccountModule,
        JarModule,
        MonthScoreModule,
        CoachModule,
        TransactionModule,
        HouseholdSettingsModule,
        FixedCostModule,
        DebtModule,
        GoalModule,
    ],
    controllers: [DashboardController],
    providers: [DashboardService, MoneyCoachService],
    exports: [DashboardService, MoneyCoachService],
})
export class DashboardModule {}
