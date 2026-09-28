import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { GivingOrganization } from './giving-organization.entity';
import { GivingOrganizationService } from './giving-organization.service';

@Module({
    imports: [MikroOrmModule.forFeature([GivingOrganization])],
    providers: [GivingOrganizationService],
    exports: [GivingOrganizationService],
})
export class GivingOrganizationModule {}
