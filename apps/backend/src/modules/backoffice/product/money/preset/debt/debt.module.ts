import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { DebtPresetMerchant } from './debt-merchant.entity';
import { DebtPreset } from './debt.entity';
import { DebtPresetService } from './debt.service';

@Module({
    imports: [MikroOrmModule.forFeature([DebtPreset, DebtPresetMerchant])],
    providers: [DebtPresetService],
    exports: [DebtPresetService],
})
export class DebtPresetModule {}
