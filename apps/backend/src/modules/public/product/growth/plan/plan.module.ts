import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { GrowthPlanItem } from './growth-plan-item.entity';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';

/** The Growth cascade (year → day). Visibility comes from the global VisibilityModule. */
@Module({
    imports: [MikroOrmModule.forFeature([GrowthPlanItem])],
    controllers: [PlanController],
    providers: [PlanService],
    exports: [PlanService],
})
export class PlanModule {}
