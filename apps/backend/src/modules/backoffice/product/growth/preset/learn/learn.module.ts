import { Module } from '@nestjs/common';

import { BookPresetModule } from './book';
import { WatchPresetModule } from './watch';

/** Growth → Learn presets. Books and what we recommend you watch. */
@Module({
    imports: [BookPresetModule, WatchPresetModule],
    exports: [BookPresetModule, WatchPresetModule],
})
export class LearnPresetModule {}
