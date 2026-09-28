import { Module } from '@nestjs/common';

import { CommunicationModule } from './communication';
import { PlanModule } from './plan';
import { ProductModule } from './product';
import { ReferenceModule } from './reference';

/**
 * Backoffice plane — Rumtelo writes; households/users do not.
 *
 *   product/        catalogs tied to a product line (money, growth, …)
 *   reference/      cross-product lookups (device kinds, …)
 *   plan/           Basic / Plus / Max tiers
 *   communication/  outbound email (invites, digests later)
 */
@Module({
    imports: [ProductModule, ReferenceModule, PlanModule, CommunicationModule],
    exports: [ProductModule, ReferenceModule, PlanModule, CommunicationModule],
})
export class BackofficeModule {}
