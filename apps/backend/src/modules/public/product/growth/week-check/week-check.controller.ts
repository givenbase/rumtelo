import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { currentWeek } from '../../../../../common/utils/period.util';
import { GrowthWeekCheckService } from './week-check.service';

/**
 * Course part of the one week check (Plus and Max). Transport only. Handler order is
 * always CRUD. Gated like the rest of Course; Basic households get `plan_missing_capability`.
 */
@ControllerSwagger('growth/week-check', 'public')
@RequireCapability(CAPABILITIES.growthCourse)
export class GrowthWeekCheckController {
    constructor(
        @Inject(GrowthWeekCheckService) private readonly weekChecks: GrowthWeekCheckService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return (or lazily create) the week check for a given week. */
    @Implement(contract.growth.weekCheck.current)
    current() {
        return implement(contract.growth.weekCheck.current).handler(({ input }) =>
            this.weekChecks.current(input.week ?? currentWeek())
        );
    }

    /** Last 26 weeks of week checks, newest first. */
    @Implement(contract.growth.weekCheck.history)
    history() {
        return implement(contract.growth.weekCheck.history).handler(() =>
            this.weekChecks.history()
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Mark the week check complete (shell — product steps land later). */
    @Implement(contract.growth.weekCheck.complete)
    complete() {
        return implement(contract.growth.weekCheck.complete).handler(({ input }) =>
            this.weekChecks.complete(input.week)
        );
    }
}
