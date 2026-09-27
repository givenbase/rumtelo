import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';

import { isLaunchProductsDeferred } from '../../../../common/config/launch-products.util';
import { AccountModule } from '../../../auth/user/account/account.module';
import { HouseholdBillingModule } from '../../../auth/household/household-billing/household-billing.module';
import { HouseholdSettingsModule } from '../../../auth/household/household-settings/household-settings.module';
import { EnergyDashboardModule } from '../../product/energy/dashboard/dashboard.module';
import { GrowthDashboardModule } from '../../product/growth/dashboard/dashboard.module';
import { DashboardModule } from '../../product/money/dashboard/dashboard.module';
import { SoulDashboardModule } from '../../product/soul/dashboard/dashboard.module';
import { BillingModule } from '../billing/billing.module';
import { Address } from '../address/address.entity';
import { PracticeAddress } from './practice-address/practice-address.entity';
import { PracticeBilling } from './practice-billing/practice-billing.entity';
import { PracticeClientLink } from './practice-client-link/practice-client-link.entity';
import { PracticeClientLinkFlag } from './practice-client-link-flag/practice-client-link-flag.entity';
import { PracticeMember } from './practice-member/practice-member.entity';
import { Practice } from './practice/practice.entity';
import { PracticeService } from './practice.service';

const launchDeferred = isLaunchProductsDeferred();

/**
 * Practice domain providers without HTTP controller — importable from Household
 * for dual-consent practiceLinks without double-registering PracticeController.
 */
@Module({
    imports: [
        AccountModule,
        BillingModule,
        HouseholdBillingModule,
        HouseholdSettingsModule,
        DashboardModule,
        GrowthDashboardModule,
        ...(launchDeferred ? [] : [EnergyDashboardModule, SoulDashboardModule]),
        MikroOrmModule.forFeature([
            Address,
            Practice,
            PracticeAddress,
            PracticeMember,
            PracticeClientLink,
            PracticeClientLinkFlag,
            PracticeBilling,
        ]),
    ],
    providers: [PracticeService],
    exports: [PracticeService],
})
export class PracticeCoreModule {}
