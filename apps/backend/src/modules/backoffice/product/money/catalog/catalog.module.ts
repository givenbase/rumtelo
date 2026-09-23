import { Module } from '@nestjs/common';

import { AudienceModule } from './audience';
import { BankModule } from './bank';
import { GivingOrganisationModule } from './giving-organisation';
import { MarketModule } from './market';

/** Money catalogs — editorial lookups that are neither templates nor form presets. */
@Module({
    imports: [AudienceModule, BankModule, GivingOrganisationModule, MarketModule],
    exports: [AudienceModule, BankModule, GivingOrganisationModule, MarketModule],
})
export class MoneyCatalogModule {}
