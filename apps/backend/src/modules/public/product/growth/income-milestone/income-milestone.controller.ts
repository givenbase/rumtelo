import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { MilestoneService } from './milestone.service';

/** Transport only. Handler order is always CRUD. */
@RequireCapability(CAPABILITIES.growthNetWorth)
@ControllerSwagger('growth/milestones', 'public')
export class MilestoneController {
    constructor(@Inject(MilestoneService) private readonly milestones: MilestoneService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List income milestones for the current household. */
    @Implement(contract.growth.milestones.list)
    list() {
        return implement(contract.growth.milestones.list).handler(() => this.milestones.list());
    }
}
