import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../../auth/user/account/account.module';
import { FocusController } from './focus.controller';
import { FocusService } from './focus.service';

/** Which skills the person has in focus. Presence of a row is the switch. */
@Module({
    imports: [AccountModule],
    controllers: [FocusController],
    providers: [FocusService],
    exports: [FocusService],
})
export class FocusModule {}
