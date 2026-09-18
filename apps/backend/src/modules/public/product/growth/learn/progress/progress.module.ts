import { Module } from '@nestjs/common';

import { AccountModule } from '../../../../../auth/user/account/account.module';
import { FocusModule } from '../focus/focus.module';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

/** The person's marks: need it, on it, or finished. No row means still on the shelf. */
@Module({
    imports: [AccountModule, FocusModule],
    controllers: [ProgressController],
    providers: [ProgressService],
    exports: [ProgressService],
})
export class ProgressModule {}
