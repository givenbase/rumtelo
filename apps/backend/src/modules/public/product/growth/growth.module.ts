import { Module } from '@nestjs/common';

import { GrowthCatalogsModule } from './catalogs/catalogs.module';
import { GrowthDashboardModule } from './dashboard/dashboard.module';
import { IncomeLeverModule } from './income-lever/income-lever.module';
import { IncomeMilestoneModule } from './income-milestone/income-milestone.module';
import { GrowthWeekCheckModule } from './week-check/week-check.module';

/**
 * Product: Groei. Everything about raising earning power rather than dividing
 * what already arrived. Mirrors the Groei portal in the application navigation.
 */
@Module({
    imports: [
        IncomeLeverModule,
        IncomeMilestoneModule,
        GrowthCatalogsModule,
        GrowthWeekCheckModule,
        GrowthDashboardModule,
    ],
    exports: [
        IncomeLeverModule,
        IncomeMilestoneModule,
        GrowthCatalogsModule,
        GrowthWeekCheckModule,
        GrowthDashboardModule,
    ],
})
export class GrowthModule {}
