import { Module } from '@nestjs/common';

import { BillingModule } from './billing/billing.module';
import { CoachModule } from './coach/coach.module';
import { ContactModule } from './contact/contact.module';
import { PracticeModule } from './practice/practice.module';

/**
 * Platform Module — cross-product household surfaces (coach, billing, contact, practice).
 */
@Module({
    imports: [CoachModule, BillingModule, ContactModule, PracticeModule],
    exports: [CoachModule, BillingModule, ContactModule, PracticeModule],
})
export class PlatformModule {}
