import { Module } from '@nestjs/common';

import { AccountModule } from '../../../auth/user/account/account.module';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';
import { CoachSessionService } from './coach-session.service';

@Module({
    imports: [AccountModule],
    controllers: [CoachController],
    providers: [CoachService, CoachSessionService],
    exports: [CoachService, CoachSessionService],
})
export class CoachModule {}
