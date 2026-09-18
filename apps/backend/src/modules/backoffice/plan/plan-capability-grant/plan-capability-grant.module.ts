import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { PlanCapabilityGrant } from './plan-capability-grant.entity';

@Module({
    imports: [MikroOrmModule.forFeature([PlanCapabilityGrant])],
    exports: [MikroOrmModule],
})
export class PlanCapabilityGrantModule {}
