import { Module } from '@nestjs/common';

import { AccountSettingsModule } from '../../../../../auth/user/account/account-settings';
import { TranslationModule } from '../../../../../backoffice/admin/translation';
import { JarTemplateModule } from '../../../../../backoffice/product/money/template/jar/jar.module';
import { JarController } from './jar.controller';
import { JarService } from './jar.service';

@Module({
    imports: [AccountSettingsModule, TranslationModule, JarTemplateModule],
    controllers: [JarController],
    providers: [JarService],
    exports: [JarService],
})
export class JarModule {}
