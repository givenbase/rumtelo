import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { CourseService } from './course.service';

/** Implements `contract.growth.course`. Transport only; handler order is always CRUD. */
@ControllerSwagger('growth/course', 'public')
@RequireCapability(CAPABILITIES.growthCourse)
export class CourseController {
    constructor(@Inject(CourseService) private readonly course: CourseService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** New item in a slot (max 3). */
    @Implement(contract.growth.course.create)
    create() {
        return implement(contract.growth.course.create).handler(({ input }) =>
            this.course.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** One period with its "why" chain and the layer below. */
    @Implement(contract.growth.course.period)
    period() {
        return implement(contract.growth.course.period).handler(({ input }) =>
            this.course.period(input)
        );
    }

    /** Year, quarter and month items of one year. */
    @Implement(contract.growth.course.year)
    year() {
        return implement(contract.growth.course.year).handler(({ input }) =>
            this.course.year(input.year)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Edit, re-parent, reorder or change visibility. */
    @Implement(contract.growth.course.update)
    update() {
        return implement(contract.growth.course.update).handler(({ input }) =>
            this.course.update(input)
        );
    }

    /** Review status and note. */
    @Implement(contract.growth.course.updateStatus)
    updateStatus() {
        return implement(contract.growth.course.updateStatus).handler(({ input }) =>
            this.course.updateStatus(input)
        );
    }

    /** Carry an unfinished item into the next period. */
    @Implement(contract.growth.course.carry)
    carry() {
        return implement(contract.growth.course.carry).handler(({ input }) =>
            this.course.carry(input.id)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Delete; children become loose. */
    @Implement(contract.growth.course.remove)
    remove() {
        return implement(contract.growth.course.remove).handler(({ input }) =>
            this.course.remove(input.id)
        );
    }
}
