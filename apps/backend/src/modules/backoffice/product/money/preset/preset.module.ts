import { Module } from '@nestjs/common';

import { DebtPresetModule } from './debt';
import { FixedCostPresetModule } from './fixed-cost';
import { GoalPresetModule } from './goal';
import { IncomeSourcePresetModule } from './income';
import { MerchantPresetModule } from './merchant';
import { TransactionInPresetModule } from './transaction-in';

/** Money presets — suggestion catalogs for create forms. */
@Module({
    imports: [
        FixedCostPresetModule,
        DebtPresetModule,
        IncomeSourcePresetModule,
        GoalPresetModule,
        MerchantPresetModule,
        TransactionInPresetModule,
    ],
    exports: [
        FixedCostPresetModule,
        DebtPresetModule,
        IncomeSourcePresetModule,
        GoalPresetModule,
        MerchantPresetModule,
        TransactionInPresetModule,
    ],
})
export class MoneyPresetModule {}
