import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BANK_SYNC_CRON } from './bank-sync.constants';
import { BankSyncService } from './bank-sync.service';

/**
 * Background AIS pull — every 6 hours when FEATURE_BANK_SYNC is on.
 * Failures are logged per seat; one bad bank does not stop the run.
 */
@Injectable()
export class BankSyncScheduler {
    private readonly logger = new Logger(BankSyncScheduler.name);

    constructor(@Inject(BankSyncService) private readonly bankSync: BankSyncService) {}

    @Cron(BANK_SYNC_CRON)
    async pullLinkedAccounts() {
        this.logger.debug('Bank sync cron tick');
        await this.bankSync.syncAllLinkedForCron();
    }
}
