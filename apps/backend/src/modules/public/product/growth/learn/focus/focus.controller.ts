import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { FocusService } from './focus.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('growth/learn/focus', 'public')
export class FocusController {
    constructor(@Inject(FocusService) private readonly focus: FocusService) {}

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Turn a skill's focus on or off. */
    @Implement(contract.growth.learn.focus)
    focusSkill() {
        return implement(contract.growth.learn.focus).handler(({ input }) =>
            this.focus.focus(input.skill, input.on)
        );
    }
}
