import { Module } from '@nestjs/common';

import { AssetKindModule } from './kind/asset-kind.module';
import { AssetPresetService } from './asset.service';

/** Asset names and the class each name belongs to. */
@Module({
    imports: [AssetKindModule],
    providers: [AssetPresetService],
    exports: [AssetPresetService, AssetKindModule],
})
export class AssetPresetModule {}

export { AssetPreset } from './asset.entity';
export { AssetPresetService };
