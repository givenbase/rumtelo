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
    // ? CREATE Operations
    // ====================================================================

    /** File a new holding for this household. */
    @Implement(contract.growth.assets.create)
    create() {
        return implement(contract.growth.assets.create).handler(({ input }) =>
            this.assets.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Everything this household owns. */
    @Implement(contract.growth.assets.list)
    list() {
        return implement(contract.growth.assets.list).handler(() => this.assets.list());
    }

    /** One holding, for the detail page. */
    @Implement(contract.growth.assets.get)
    get() {
        return implement(contract.growth.assets.get).handler(({ input }) =>
            this.assets.get(input.id)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Replace the name, class, value, and monthly pay. */
    @Implement(contract.growth.assets.update)
    update() {
        return implement(contract.growth.assets.update).handler(({ input }) =>
            this.assets.update(input)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove a holding from this household. */
    @Implement(contract.growth.assets.remove)
    remove() {
        return implement(contract.growth.assets.remove).handler(({ input }) =>
            this.assets.remove(input.id)
        );
    }
}
