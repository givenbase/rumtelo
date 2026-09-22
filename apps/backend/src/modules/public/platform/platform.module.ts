import { Module } from '@nestjs/common';

import { BillingModule } from './billing/billing.module';
import { CoachModule } from './coach/coach.module';
import { ContactModule } from './contact/contact.module';

/**
 * Platform Module — cross-product household surfaces (coach, billing, contact).
 */
@Module({
    imports: [CoachModule, BillingModule, ContactModule],
    exports: [CoachModule, BillingModule, ContactModule],
})
export class PlatformModule {}
