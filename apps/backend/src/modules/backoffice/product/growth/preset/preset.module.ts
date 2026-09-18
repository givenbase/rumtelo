import { Module } from '@nestjs/common';

import { AssetPresetModule } from './asset/asset.module';
import { LearnPresetModule } from './learn';
import { LeverPresetModule } from './lever';

/** Growth presets, grouped by the feature they belong to. */
@Module({
    imports: [LeverPresetModule, LearnPresetModule, AssetPresetModule],
    exports: [LeverPresetModule, LearnPresetModule, AssetPresetModule],
})
export class GrowthPresetModule {}
