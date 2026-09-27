import { Module } from '@nestjs/common';

import { SortRuleModule } from '../ledger/sort-rule/sort-rule.module';
import { FixedCostModule } from '../plan/fixed-cost/fixed-cost.module';
import { IncomeModule } from '../plan/income/income.module';
import { JarModule } from '../plan/jar/jar.module';
import { DebtModule } from '../targets/debt/debt.module';
import { GoalModule } from '../targets/goal/goal.module';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';

/** Cross-cutting JSON archive restore across plan / ledger / targets. */
@Module({
    imports: [JarModule, IncomeModule, FixedCostModule, DebtModule, GoalModule, SortRuleModule],
    controllers: [ArchiveController],
    providers: [ArchiveService],
    exports: [ArchiveService],
})
export class ArchiveModule {}
