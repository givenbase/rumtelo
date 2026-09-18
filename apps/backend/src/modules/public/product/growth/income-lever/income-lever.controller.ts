import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { LeverService } from './lever.service';

/** Transport only. Handler order is always CRUD. */
@RequireCapability(CAPABILITIES.growthIncome)
@ControllerSwagger('growth/levers', 'public')
export class LeverController {
    constructor(@Inject(LeverService) private readonly levers: LeverService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List income levers for the current household. */
    @Implement(contract.growth.levers.list)
    list() {
        return implement(contract.growth.levers.list).handler(() => this.levers.list());
    }
}
