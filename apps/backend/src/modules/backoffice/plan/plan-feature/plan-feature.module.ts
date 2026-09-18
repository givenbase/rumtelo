import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { PlanFeature } from './plan-feature.entity';

@Module({
    imports: [MikroOrmModule.forFeature([PlanFeature])],
    exports: [MikroOrmModule],
})
export class PlanFeatureModule {}
