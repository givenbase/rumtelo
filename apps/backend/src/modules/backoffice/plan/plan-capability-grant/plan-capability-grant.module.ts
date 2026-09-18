import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { PlanCapability } from './plan-capability.entity';

@Module({
    imports: [MikroOrmModule.forFeature([PlanCapability])],
    exports: [MikroOrmModule],
})
export class PlanCapabilityModule {}
