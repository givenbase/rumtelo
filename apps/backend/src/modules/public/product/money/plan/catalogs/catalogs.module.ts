import { Module } from '@nestjs/common';

import { AccountSettingsModule } from '../../../../../auth/user/account/account-settings';
import { TranslationModule } from '../../../../../backoffice/admin/translation';
import { ProductModule } from '../../../../../backoffice/product';

import { MoneyCatalogsController } from './catalogs.controller';

/** Public API surface for money company catalogs (templates + presets). */
@Module({
    imports: [ProductModule, AccountSettingsModule, TranslationModule],
    controllers: [MoneyCatalogsController],
})
export class MoneyCatalogsModule {}
