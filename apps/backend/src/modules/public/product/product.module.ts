import { Module } from '@nestjs/common';

import { GrowthModule } from './growth/growth.module';
import { MoneyModule } from './money/money.module';

/**
 * Product plane — household-facing portals.
 *
 *   money/   Geld
 *   growth/  Groei
 *   energy/  Energie  (code kept; entities excluded from MikroORM — see mikro-orm.config)
 *   soul/    Ziel     (code kept; entities excluded from MikroORM — see mikro-orm.config)
 *
 * Lives under modules/public (Postgres `public` schema).
 * Energy / Soul modules are not registered until their schemas are redesigned.
 */
@Module({
    imports: [MoneyModule, GrowthModule],
    exports: [MoneyModule, GrowthModule],
})
export class ProductModule {}
