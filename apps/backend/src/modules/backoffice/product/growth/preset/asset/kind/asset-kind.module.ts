import { Module } from '@nestjs/common';

import { AssetKindService } from './asset-kind.service';

/** Growth asset classes — what a household can own. */
@Module({
    providers: [AssetKindService],
    exports: [AssetKindService],
})
export class AssetKindModule {}

export { AssetKind } from './asset-kind.entity';
export { AssetKindService };
