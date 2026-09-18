import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';

import { Capability } from './capability.entity';

@Module({
    imports: [MikroOrmModule.forFeature([Capability])],
    exports: [MikroOrmModule],
})
export class CapabilityModule {}
