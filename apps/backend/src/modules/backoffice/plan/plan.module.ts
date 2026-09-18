import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { PlanCapabilityModule } from './plan-capability';
import { PlanCapabilityGrantModule } from './plan-capability-grant';
import { PlanController } from './plan.controller';
import { Plan } from './plan.entity';
import { PlanFeatureModule } from './plan-feature';
import { PlanProductModule } from './plan-product';
import { PlanService } from './plan.service';

/**
 * Plan Module — parent: Plan entity + catalog children (product / feature / capability / grant).
 */
@Module({
    imports: [
        MikroOrmModule.forFeature([Plan]),
        PlanProductModule,
        PlanFeatureModule,
        PlanCapabilityModule,
        PlanCapabilityGrantModule,
    ],
    controllers: [PlanController],
    providers: [PlanService],
    exports: [
        PlanService,
        PlanProductModule,
        PlanFeatureModule,
        PlanCapabilityModule,
        PlanCapabilityGrantModule,
    ],
})
export class PlanModule {}
