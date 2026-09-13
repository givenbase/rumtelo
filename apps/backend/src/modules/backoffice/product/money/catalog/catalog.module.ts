import { Module } from '@nestjs/common';

import { GivingOrganisationModule } from './giving-organisation';

/** Money catalogs — editorial lookups that are neither templates nor form presets. */
@Module({
    imports: [GivingOrganisationModule],
    exports: [GivingOrganisationModule],
})
export class MoneyCatalogModule {}
