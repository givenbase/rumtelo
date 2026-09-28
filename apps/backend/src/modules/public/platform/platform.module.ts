import { Module } from '@nestjs/common';

import { BillingModule } from './billing/billing.module';
import { CoachModule } from './coach/coach.module';
import { ContactModule } from './contact/contact.module';
import { DeviceModule } from './device/device.module';
import { PracticeModule } from './practice/practice.module';

/**
 * Platform Module — cross-product household surfaces (coach, billing, contact, device, practice).
 */
@Module({
    imports: [CoachModule, BillingModule, ContactModule, DeviceModule, PracticeModule],
    exports: [CoachModule, BillingModule, ContactModule, DeviceModule, PracticeModule],
})
export class PlatformModule {}
