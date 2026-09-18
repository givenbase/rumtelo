import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { PlanProduct } from './product.entity';

@Module({
    imports: [MikroOrmModule.forFeature([PlanProduct])],
    exports: [MikroOrmModule],
})
export class PlanProductModule {}
