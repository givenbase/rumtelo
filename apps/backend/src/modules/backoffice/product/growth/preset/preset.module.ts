import { Module } from '@nestjs/common';

import { LearnPresetModule } from './learn';
import { LeverPresetModule } from './lever';

/** Growth presets, grouped by the feature they belong to. */
@Module({
    imports: [LeverPresetModule, LearnPresetModule],
    exports: [LeverPresetModule, LearnPresetModule],
})
export class GrowthPresetModule {}
