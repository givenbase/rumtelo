import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { MerchantBranding } from './merchant-branding.entity';
import { MerchantMatching } from './merchant-matching.entity';
import { MerchantPreset } from './merchant.entity';
import { MerchantPresetService } from './merchant.service';

@Module({
    imports: [MikroOrmModule.forFeature([MerchantPreset, MerchantMatching, MerchantBranding])],
    providers: [MerchantPresetService],
    exports: [MerchantPresetService],
})
export class MerchantPresetModule {}
