import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { contract } from '@rumtelo/contracts';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { AssetService } from './asset.service';

/** Transport only. What this household owns. */
@ControllerSwagger('growth/assets', 'public')
export class AssetController {
    constructor(@Inject(AssetService) private readonly assets: AssetService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Everything this household owns. */
    @Implement(contract.growth.assets.list)
    list() {
        return implement(contract.growth.assets.list).handler(() => this.assets.list());
    }
}
