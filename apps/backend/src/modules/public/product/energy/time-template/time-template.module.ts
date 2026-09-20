import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../auth/user/account/account.module';
import { TimeModule } from '../time/time.module';
import { TimeTemplateController } from './time-template.controller';
import { TimeTemplateService } from './time-template.service';

/** A person's typical workday / day off — the one-tap default behind "log a day". */
@Module({
    imports: [AccountModule, TimeModule],
    controllers: [TimeTemplateController],
    providers: [TimeTemplateService],
    exports: [TimeTemplateService],
})
export class TimeTemplateModule {}
