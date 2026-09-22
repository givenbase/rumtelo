import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { TranslationModule } from '../../../../admin/translation';
import { FixedCostPresetMerchant } from './fixed-cost-merchant.entity';
import { FixedCostPreset } from './fixed-cost.entity';
import { FixedCostPresetService } from './fixed-cost.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([FixedCostPreset, FixedCostPresetMerchant]),
        TranslationModule,
    ],
    providers: [FixedCostPresetService],
    exports: [FixedCostPresetService],
})
export class FixedCostPresetModule {}
