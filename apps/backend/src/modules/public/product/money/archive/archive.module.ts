import { Module } from '@nestjs/common';

import { HouseholdSettingsModule } from '../../../../auth/household/household-settings/household-settings.module';
import { AccountSettingsModule } from '../../../../auth/user/account/account-settings/account-settings.module';
import { BankAccountModule } from '../ledger/bank-account/bank-account.module';
import { SortRuleModule } from '../ledger/sort-rule/sort-rule.module';
import { FixedCostModule } from '../plan/fixed-cost/fixed-cost.module';
import { IncomeModule } from '../plan/income/income.module';
import { JarModule } from '../plan/jar/jar.module';
import { PartyModule } from '../plan/party/party.module';
import { DebtModule } from '../targets/debt/debt.module';
import { GoalModule } from '../targets/goal/goal.module';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';

/** Cross-cutting JSON archive restore across plan / ledger / targets / settings. */
@Module({
    imports: [
        JarModule,
        PartyModule,
        IncomeModule,
        FixedCostModule,
        DebtModule,
        GoalModule,
        SortRuleModule,
        BankAccountModule,
        HouseholdSettingsModule,
        AccountSettingsModule,
    ],
    controllers: [ArchiveController],
    providers: [ArchiveService],
    exports: [ArchiveService],
})
export class ArchiveModule {}
