import { Module } from '@nestjs/common';

import { WatchPreset } from './watch.entity';
import { WatchPresetService } from './watch.service';

/** Growth watch presets — films, videos, and series we recommend, never host. */
@Module({
    providers: [WatchPresetService],
    exports: [WatchPresetService],
})
export class WatchPresetModule {}

export { WatchPreset, WatchPresetService };
