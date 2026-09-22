import type { EntityManager } from '@mikro-orm/postgresql';

import { Seeder } from '@mikro-orm/seeder';

import { isLaunchProductsDeferred } from '../../common/config/launch-products.util';
import { PlanSeeder } from './plan/PlanSeeder';
import { AudienceSeeder } from './product/money/AudienceSeeder';
import { CategoryTemplateSeeder } from './product/money/CategoryTemplateSeeder';
import { DebtPresetSeeder } from './product/money/DebtPresetSeeder';
import { FixedCostPresetSeeder } from './product/money/FixedCostPresetSeeder';
import { GivingOrganisationSeeder } from './product/money/GivingOrganisationSeeder';
import { GoalPresetSeeder } from './product/money/GoalPresetSeeder';
import { IncomeSourcePresetSeeder } from './product/money/IncomeSourcePresetSeeder';
import { CatalogTranslationSeeder } from './product/money/CatalogTranslationSeeder';
import { JarTemplateSeeder } from './product/money/JarTemplateSeeder';
import { MarketSeeder } from './product/money/MarketSeeder';
import { MerchantPresetSeeder } from './product/money/MerchantPresetSeeder';
import { TransactionInPresetSeeder } from './product/money/TransactionInPresetSeeder';
import { BookPresetSeeder } from './product/growth/BookPresetSeeder';
import { WatchPresetSeeder } from './product/growth/WatchPresetSeeder';
import { IncomePostureSeeder } from './product/growth/IncomePostureSeeder';
import { LeverPresetSeeder } from './product/growth/LeverPresetSeeder';
import { AssetKindSeeder } from './product/growth/AssetKindSeeder';
import { AssetPresetSeeder } from './product/growth/AssetPresetSeeder';
import { WealthStageSeeder } from './product/growth/WealthStageSeeder';
import { DemoHouseholdSeeder } from './demo/DemoHouseholdSeeder';

/**
 * Root seeder — backoffice product catalogs first, then plans, then demo data.
 * Layout mirrors backoffice/product/{money|growth} and backoffice/plan.
 *
 * Production (`db:seed:prod`): skips demo households. Staging keeps them.
 */
export class DatabaseSeeder extends Seeder {
    async run(em: EntityManager): Promise<void> {
        const seeders = [
            // Lookups first — presets link to them by FK.
            JarTemplateSeeder,
            CategoryTemplateSeeder,
            CatalogTranslationSeeder,
            AudienceSeeder,
            MarketSeeder,
            GivingOrganisationSeeder,
            MerchantPresetSeeder,
            // Presets that link to merchants.
            FixedCostPresetSeeder,
            DebtPresetSeeder,
            IncomeSourcePresetSeeder,
            TransactionInPresetSeeder,
            GoalPresetSeeder,
            IncomePostureSeeder,
            WealthStageSeeder,
            AssetKindSeeder,
            AssetPresetSeeder,
            LeverPresetSeeder,
            BookPresetSeeder,
            WatchPresetSeeder,
            PlanSeeder,
            ...(isLaunchProductsDeferred() ? [] : [DemoHouseholdSeeder]),
        ];
        return this.call(em, seeders);
    }
}
