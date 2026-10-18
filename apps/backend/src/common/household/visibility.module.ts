import { Global, Module } from '@nestjs/common';

import { HouseholdSettingsModule } from '../../modules/auth/household/household-settings/household-settings.module';
import { AccountModule } from '../../modules/auth/user/account/account.module';

import { VisibilityService } from './visibility.service';

/**
 * Global so every portal with person-attributed rows can build a
 * `PersonalScopedRepository` without re-importing settings, billing and accounts.
 */
@Global()
@Module({
    imports: [HouseholdSettingsModule, AccountModule],
    providers: [VisibilityService],
    exports: [VisibilityService],
})
export class VisibilityModule {}
