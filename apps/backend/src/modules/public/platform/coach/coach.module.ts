import { Module } from '@nestjs/common';

import { AccountModule } from '../../../auth/user/account/account.module';
import { CoachController } from './coach.controller';
import { CoachService } from './coach.service';

@Module({
    imports: [AccountModule],
    controllers: [CoachController],
    providers: [CoachService],
    exports: [CoachService],
})
export class CoachModule {}
