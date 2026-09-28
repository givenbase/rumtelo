import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { AccountModule } from '../../../auth/user/account/account.module';
import { HouseholdBillingModule } from '../../../auth/household/household-billing/household-billing.module';
import { HouseholdSettingsModule } from '../../../auth/household/household-settings/household-settings.module';
import { EmailModule } from '../../../backoffice/communication/email';
import { GrowthDashboardModule } from '../../product/growth/dashboard/dashboard.module';
import { DashboardModule } from '../../product/money/dashboard/dashboard.module';
import { BillingModule } from '../billing/billing.module';
import { Address } from '../address/address.entity';
import { PracticeAddress } from './practice-address/practice-address.entity';
import { PracticeBilling } from './practice-billing/practice-billing.entity';
import { PracticeClientInvite } from './practice-client-invite/practice-client-invite.entity';
import { PracticeClientLink } from './practice-client-link/practice-client-link.entity';
import { PracticeClientLinkFlag } from './practice-client-link-flag/practice-client-link-flag.entity';
import { PracticeMember } from './practice-member/practice-member.entity';
import { Practice } from './practice/practice.entity';
import { PracticeService } from './practice.service';

/**
 * Practice domain providers without HTTP controller — importable from Household
 * for dual-consent practiceLinks without double-registering PracticeController.
 *
 * Energy / Soul dashboards omitted — their entities are excluded from MikroORM
 * discovery until concept schemas are redesigned (see mikro-orm.config).
 */
@Module({
    imports: [
        AccountModule,
        BillingModule,
        EmailModule,
        HouseholdBillingModule,
        HouseholdSettingsModule,
        DashboardModule,
        GrowthDashboardModule,
        MikroOrmModule.forFeature([
            Address,
            Practice,
            PracticeAddress,
            PracticeMember,
            PracticeClientLink,
            PracticeClientLinkFlag,
            PracticeClientInvite,
            PracticeBilling,
        ]),
    ],
    providers: [PracticeService],
    exports: [PracticeService],
})
export class PracticeCoreModule {}
