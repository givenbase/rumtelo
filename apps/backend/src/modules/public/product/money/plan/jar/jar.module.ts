import { Module } from '@nestjs/common';

import { AccountSettingsModule } from '../../../../../auth/user/account/account-settings';
import { TranslationModule } from '../../../../../backoffice/admin/translation';
import { JarController } from './jar.controller';
import { JarService } from './jar.service';

@Module({
    imports: [AccountSettingsModule, TranslationModule],
    controllers: [JarController],
    providers: [JarService],
    exports: [JarService],
})
export class JarModule {}
