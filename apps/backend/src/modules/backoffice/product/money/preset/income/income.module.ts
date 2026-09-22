import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { IncomeSourcePreset } from './income.entity';
import { IncomeSourcePresetService } from './income.service';

@Module({
    imports: [MikroOrmModule.forFeature([IncomeSourcePreset]), TranslationModule],
    providers: [IncomeSourcePresetService],
    exports: [IncomeSourcePresetService],
})
export class IncomeSourcePresetModule {}
