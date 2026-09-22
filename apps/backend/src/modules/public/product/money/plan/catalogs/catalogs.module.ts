import { Module } from '@nestjs/common';

import { AccountSettingsModule } from '../../../../../auth/user/account/account-settings';
import { ProductModule } from '../../../../../backoffice/product';

import { MoneyCatalogsController } from './catalogs.controller';

/** Public API surface for money company catalogs (templates + presets). */
@Module({
    imports: [ProductModule, AccountSettingsModule],
    controllers: [MoneyCatalogsController],
})
export class MoneyCatalogsModule {}
