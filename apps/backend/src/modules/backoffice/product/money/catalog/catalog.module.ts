import { Module } from '@nestjs/common';

import { AudienceModule } from './audience';
import { BankModule } from './bank';
import { GivingOrganizationModule } from './giving-organization';
import { MarketModule } from './market';

/** Money catalogs — editorial lookups that are neither templates nor form presets. */
@Module({
    imports: [AudienceModule, BankModule, GivingOrganizationModule, MarketModule],
    exports: [AudienceModule, BankModule, GivingOrganizationModule, MarketModule],
})
export class MoneyCatalogModule {}
