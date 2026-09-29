import { Module } from '@nestjs/common';

import { MoneyCatalogsModule } from './catalogs/catalogs.module';
import { FixedCostModule } from './fixed-cost/fixed-cost.module';
import { IncomeModule } from './income/income.module';
import { JarModule } from './jar/jar.module';
import { PartyModule } from './party/party.module';

/** The split setup: six jars, income sources, fixed costs, saved parties, and company catalogs. */
@Module({
    imports: [JarModule, IncomeModule, FixedCostModule, PartyModule, MoneyCatalogsModule],
    exports: [JarModule, IncomeModule, FixedCostModule, PartyModule, MoneyCatalogsModule],
})
export class PlanModule {}
