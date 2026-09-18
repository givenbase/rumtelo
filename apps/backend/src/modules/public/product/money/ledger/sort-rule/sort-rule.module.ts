import { Module } from '@nestjs/common';

import { SortRuleController } from './sort-rule.controller';
import { SortRuleService } from './sort-rule.service';

@Module({
    controllers: [SortRuleController],
    providers: [SortRuleService],
    exports: [SortRuleService],
})
export class SortRuleModule {}
