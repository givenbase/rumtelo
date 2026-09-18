import { Module } from '@nestjs/common';

import { MerchantPresetModule } from '../../../../../backoffice/product/money/preset/merchant';
import { SortRuleController } from './sort-rule.controller';
import { SortRuleService } from './sort-rule.service';

@Module({
    imports: [MerchantPresetModule],
    controllers: [SortRuleController],
    providers: [SortRuleService],
    exports: [SortRuleService],
})
export class SortRuleModule {}
