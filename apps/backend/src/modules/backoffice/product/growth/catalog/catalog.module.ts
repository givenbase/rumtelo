import { Module } from '@nestjs/common';

import { IncomePostureModule } from './income-posture/income-posture.module';
import { WealthStageModule } from './wealth-stage/wealth-stage.module';

/** Growth taxonomies — income posture and wealth stage. */
@Module({
    imports: [IncomePostureModule, WealthStageModule],
    exports: [IncomePostureModule, WealthStageModule],
})
export class GrowthCatalogModule {}
