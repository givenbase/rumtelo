import { Module } from '@nestjs/common';

import { AudienceModule } from './audience';
import { GivingOrganisationModule } from './giving-organisation';

/** Money catalogs — editorial lookups that are neither templates nor form presets. */
@Module({
    imports: [AudienceModule, GivingOrganisationModule],
    exports: [AudienceModule, GivingOrganisationModule],
})
export class MoneyCatalogModule {}
