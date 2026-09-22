import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { Audience } from './audience.entity';
import { AudienceService } from './audience.service';

@Module({
    imports: [MikroOrmModule.forFeature([Audience]), TranslationModule],
    providers: [AudienceService],
    exports: [AudienceService],
})
export class AudienceModule {}
