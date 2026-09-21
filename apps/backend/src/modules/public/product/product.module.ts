import { Module } from '@nestjs/common';

import { isLaunchProductsDeferred } from '../../../common/config/launch-products.util';
import { EnergyModule } from './energy/energy.module';
import { GrowthModule } from './growth/growth.module';
import { MoneyModule } from './money/money.module';
import { SoulModule } from './soul/soul.module';

/**
 * Product plane — household-facing portals.
 *
 *   money/   Geld
 *   growth/  Groei
 *   energy/  Energie  (deferred in production — concept schema)
 *   soul/    Ziel     (deferred in production — concept schema)
 *
 * Lives under modules/public (Postgres `public` schema).
 */
const launchDeferred = isLaunchProductsDeferred();

@Module({
    imports: [
        MoneyModule,
        GrowthModule,
        // Energy / Soul stay in the repo for staging QA; production omits them
        // until the models are redesigned (see LAUNCH_DEFERRED_PRODUCTS).
        ...(launchDeferred ? [] : [EnergyModule, SoulModule]),
    ],
    exports: [
        MoneyModule,
        GrowthModule,
        ...(launchDeferred ? [] : [EnergyModule, SoulModule]),
    ],
})
export class ProductModule {}
