import { Module } from '@nestjs/common';

import { MoneyCatalogModule } from './catalog';
import { MoneyPresetModule } from './preset';
import { MoneyTemplateModule } from './template';

/** Backoffice money catalogs — templates + presets + editorial catalogs for Geld. */
@Module({
    imports: [MoneyTemplateModule, MoneyPresetModule, MoneyCatalogModule],
    exports: [MoneyTemplateModule, MoneyPresetModule, MoneyCatalogModule],
})
export class MoneyProductModule {}
