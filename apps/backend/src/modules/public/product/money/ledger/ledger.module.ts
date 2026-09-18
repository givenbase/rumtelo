import { Module } from '@nestjs/common';

import { BankAccountModule } from './bank-account/bank-account.module';
import { SortRuleModule } from './sort-rule/sort-rule.module';
import { TransactionModule } from './transaction/transaction.module';

/** The bank reality: accounts, the transactions on them, and the rules that sort them. */
@Module({
    imports: [BankAccountModule, TransactionModule, SortRuleModule],
    exports: [BankAccountModule, TransactionModule, SortRuleModule],
})
export class LedgerModule {}
