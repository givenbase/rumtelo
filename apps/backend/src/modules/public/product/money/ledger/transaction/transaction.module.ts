import { Module } from '@nestjs/common';

import { MerchantPresetModule } from '../../../../../backoffice/product/money/preset/merchant';
import { SortRuleModule } from '../sort-rule/sort-rule.module';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

@Module({
    imports: [SortRuleModule, MerchantPresetModule],
    controllers: [TransactionController],
    providers: [TransactionService],
    exports: [TransactionService],
})
export class TransactionModule {}
