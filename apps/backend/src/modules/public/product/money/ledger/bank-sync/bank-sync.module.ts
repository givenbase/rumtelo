import { Module } from '@nestjs/common';

import { BankingModule } from '../../../../../../banking/banking.module';
import { TransactionModule } from '../transaction/transaction.module';
import { BankSyncController } from './bank-sync.controller';
import { BankSyncScheduler } from './bank-sync.scheduler';
import { BankSyncService } from './bank-sync.service';

@Module({
    imports: [BankingModule, TransactionModule],
    controllers: [BankSyncController],
    providers: [BankSyncService, BankSyncScheduler],
    exports: [BankSyncService],
})
export class BankSyncModule {}
