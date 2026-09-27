import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthNestModule } from '@thallesp/nestjs-better-auth';

import { EmailModule } from '../../backoffice/communication/email';
import { JarTemplateModule } from '../../backoffice/product/money/template/jar/jar.module';
import { PracticeCoreModule } from '../../public/platform/practice/practice-core.module';
import { AccountModule } from '../user/account/account.module';
import { HouseholdBillingModule } from './household-billing/household-billing.module';
import { HouseholdSettingsModule } from './household-settings/household-settings.module';
import { HouseholdController } from './household.controller';
import { HouseholdService } from './household.service';

/**
 * Household Module — the GROUP half of the auth plane.
 *
 *   managed/             Better Auth writes: household, member, invitation
 *   household-settings/  Rumtelo writes: board prefs (currency, week-check)
 *   household-billing/   Rumtelo writes: plan tier + Stripe subscription pointers
 *   household.*          orchestration over Better Auth's organization API
 *   practiceLinks.*      dual-consent accept/reject via PracticeService
 */
@Module({
    imports: [
        BetterAuthNestModule,
        HouseholdSettingsModule,
        HouseholdBillingModule,
        AccountModule,
        JarTemplateModule,
        EmailModule,
        PracticeCoreModule,
    ],
    controllers: [HouseholdController],
    providers: [HouseholdService],
    exports: [HouseholdService, HouseholdSettingsModule, HouseholdBillingModule],
})
export class HouseholdModule {}
