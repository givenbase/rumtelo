import { Module } from '@nestjs/common';

import { AudienceModule } from './audience';
import { GivingOrganisationModule } from './giving-organisation';
import { MarketModule } from './market';

/** Money catalogs — editorial lookups that are neither templates nor form presets. */
@Module({
    imports: [AudienceModule, GivingOrganisationModule, MarketModule],
    exports: [AudienceModule, GivingOrganisationModule, MarketModule],
})
export class MoneyCatalogModule {}
