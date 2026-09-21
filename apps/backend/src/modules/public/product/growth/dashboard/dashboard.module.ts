import { Module } from '@nestjs/common';

import { CoachModule } from '../../../platform/coach/coach.module';
import { JarModule } from '../../money/plan/jar/jar.module';
import { DebtModule } from '../../money/targets/debt/debt.module';
import { GoalModule } from '../../money/targets/goal/goal.module';
import { AssetModule } from '../asset/asset.module';
import { LearnModule } from '../learn/learn.module';
import { GrowthDashboardController } from './dashboard.controller';
import { GrowthDashboardService } from './dashboard.service';

@Module({
    imports: [GoalModule, JarModule, CoachModule, AssetModule, DebtModule, LearnModule],
    controllers: [GrowthDashboardController],
    providers: [GrowthDashboardService],
    exports: [GrowthDashboardService],
})
export class GrowthDashboardModule {}
