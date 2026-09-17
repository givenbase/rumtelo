import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { Audience } from './audience.entity';
import { AudienceService } from './audience.service';

@Module({
    imports: [MikroOrmModule.forFeature([Audience])],
    providers: [AudienceService],
    exports: [AudienceService],
})
export class AudienceModule {}
