import { Module } from '@nestjs/common';

import { AssetController } from './asset.controller';
import { AssetService } from './asset.service';

/** What a household owns. The class catalog lives in backoffice. */
@Module({
    controllers: [AssetController],
    providers: [AssetService],
    exports: [AssetService],
})
export class AssetModule {}

export { Asset } from './asset.entity';
export { AssetService };
