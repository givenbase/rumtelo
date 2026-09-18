import { Module } from '@nestjs/common';

import {
    AssetKindModule,
    AssetPresetModule,
    BookPresetModule,
    IncomePostureModule,
    LeverPresetModule,
    WatchPresetModule,
    WealthStageModule,
} from '../../../../backoffice/product';
import { GrowthCatalogsController } from './catalogs.controller';

/** Public API surface for growth company catalogs (presets + taxonomies). */
@Module({
    imports: [
        LeverPresetModule,
        BookPresetModule,
        WatchPresetModule,
        IncomePostureModule,
        WealthStageModule,
        AssetKindModule,
        AssetPresetModule,
    ],
    controllers: [GrowthCatalogsController],
})
export class GrowthCatalogsModule {}
