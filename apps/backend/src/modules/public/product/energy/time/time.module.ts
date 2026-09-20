import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../auth/user/account/account.module';
import { CoachModule } from '../../../platform/coach/coach.module';
import { TimeCoachService } from './time-coach.service';
import { TimeController } from './time.controller';
import { TimeService } from './time.service';

/** Daily minutes per activity category; weekly summary against multi-region evidence bands. */
@Module({
    imports: [AccountModule, CoachModule],
    controllers: [TimeController],
    providers: [TimeService, TimeCoachService],
    exports: [TimeService, TimeCoachService],
})
export class TimeModule {}
