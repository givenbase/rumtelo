import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { TimeService } from './time.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('energy/time', 'public')
export class TimeController {
    constructor(@Inject(TimeService) private readonly time: TimeService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Record or correct one day's minutes per category for the current person. */
    @Implement(contract.energy.time.create)
    create() {
        return implement(contract.energy.time.create).handler(({ input }) =>
            this.time.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Time entries for the household, optionally within a date range. */
    @Implement(contract.energy.time.list)
    list() {
        return implement(contract.energy.time.list).handler(({ input }) => this.time.list(input));
    }

    /** Weekly totals per category against evidence bands, plus per-member split. */
    @Implement(contract.energy.time.summary)
    summary() {
        return implement(contract.energy.time.summary).handler(({ input }) =>
            this.time.summary(input)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove one of the current person's entries. */
    @Implement(contract.energy.time.delete)
    delete() {
        return implement(contract.energy.time.delete).handler(({ input }) =>
            this.time.delete(input)
        );
    }
}
