import { Module } from '@nestjs/common';

import { HouseholdSettingsModule } from '../../../../auth/household/household-settings/household-settings.module';
import { TransactionModule } from '../ledger/transaction/transaction.module';
import { MonthScoreModule } from '../month-score/month-score.module';
import { WeekCheckModule } from '../week-check/week-check.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

/** Composes the owning services' facts into the board stage; no tables of its own. */
@Module({
    imports: [TransactionModule, WeekCheckModule, MonthScoreModule, HouseholdSettingsModule],
    controllers: [ProgressController],
    providers: [ProgressService],
    exports: [ProgressService],
})
export class ProgressModule {}
