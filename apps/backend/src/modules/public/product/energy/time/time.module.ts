import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../auth/user/account/account.module';
import { TimeController } from './time.controller';
import { TimeService } from './time.service';

/** Daily minutes per activity category; weekly summary against multi-region evidence bands. */
@Module({
    imports: [AccountModule],
    controllers: [TimeController],
    providers: [TimeService],
    exports: [TimeService],
})
export class TimeModule {}
