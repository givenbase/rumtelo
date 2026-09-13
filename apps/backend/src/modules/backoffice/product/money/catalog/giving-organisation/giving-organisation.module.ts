import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { GivingOrganisation } from './giving-organisation.entity';
import { GivingOrganisationService } from './giving-organisation.service';

@Module({
    imports: [MikroOrmModule.forFeature([GivingOrganisation])],
    providers: [GivingOrganisationService],
    exports: [GivingOrganisationService],
})
export class GivingOrganisationModule {}
