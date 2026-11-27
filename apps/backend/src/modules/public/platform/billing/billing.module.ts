import { Module } from '@nestjs/common';

import { HouseholdBillingModule } from '../../../auth/household/household-billing/household-billing.module';
import { HouseholdSettingsModule } from '../../../auth/household/household-settings/household-settings.module';
import { AccountModule } from '../../../auth/user/account/account.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { StripeWebhookController } from './stripe-webhook.controller';

@Module({
    imports: [HouseholdBillingModule, HouseholdSettingsModule, AccountModule],
    controllers: [BillingController, StripeWebhookController],
    providers: [BillingService],
    exports: [BillingService],
})
export class BillingModule {}
