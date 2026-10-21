import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { CourseScheduleService } from './course-schedule.service';

/** Implements `contract.growth.course.schedule` — part of Course (Plus and Max). */
@ControllerSwagger('growth/course/schedule', 'public')
@RequireCapability(CAPABILITIES.growthCourse)
export class CourseScheduleController {
    constructor(@Inject(CourseScheduleService) private readonly schedule: CourseScheduleService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    @Implement(contract.growth.course.schedule.list)
    list() {
        return implement(contract.growth.course.schedule.list).handler(({ input }) =>
            this.schedule.list(input.from, input.to)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    @Implement(contract.growth.course.schedule.snooze)
    snooze() {
        return implement(contract.growth.course.schedule.snooze).handler(({ input }) =>
            this.schedule.snooze(input.ritual, input.period)
        );
    }
}
