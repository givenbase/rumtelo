import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { RhythmService } from './rhythm.service';

/** Implements `contract.growth.course.rhythm`. Transport only; handler order is CRUD. */
@ControllerSwagger('growth/course/rhythm', 'public')
@RequireCapability(CAPABILITIES.growthCourse)
export class RhythmController {
    constructor(@Inject(RhythmService) private readonly rhythms: RhythmService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    @Implement(contract.growth.course.rhythm.create)
    create() {
        return implement(contract.growth.course.rhythm.create).handler(({ input }) =>
            this.rhythms.create(input)
        );
    }

    @Implement(contract.growth.course.rhythm.tick)
    tick() {
        return implement(contract.growth.course.rhythm.tick).handler(({ input }) =>
            this.rhythms.tick(input.id, input.date)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    @Implement(contract.growth.course.rhythm.list)
    list() {
        return implement(contract.growth.course.rhythm.list).handler(({ input }) =>
            this.rhythms.list(input)
        );
    }

    @Implement(contract.growth.course.rhythm.suggestions)
    suggestions() {
        return implement(contract.growth.course.rhythm.suggestions).handler(({ input }) =>
            this.rhythms.suggestions(input.week)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    @Implement(contract.growth.course.rhythm.update)
    update() {
        return implement(contract.growth.course.rhythm.update).handler(({ input }) =>
            this.rhythms.update(input)
        );
    }

    @Implement(contract.growth.course.rhythm.pause)
    pause() {
        return implement(contract.growth.course.rhythm.pause).handler(({ input }) =>
            this.rhythms.pause(input.id)
        );
    }

    @Implement(contract.growth.course.rhythm.resume)
    resume() {
        return implement(contract.growth.course.rhythm.resume).handler(({ input }) =>
            this.rhythms.resume(input.id)
        );
    }

    @Implement(contract.growth.course.rhythm.confirm)
    confirm() {
        return implement(contract.growth.course.rhythm.confirm).handler(({ input }) =>
            this.rhythms.confirm(input.id, input.week)
        );
    }

    @Implement(contract.growth.course.rhythm.renew)
    renew() {
        return implement(contract.growth.course.rhythm.renew).handler(({ input }) =>
            this.rhythms.renew(input.id)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    @Implement(contract.growth.course.rhythm.untick)
    untick() {
        return implement(contract.growth.course.rhythm.untick).handler(({ input }) =>
            this.rhythms.untick(input.id, input.date)
        );
    }

    @Implement(contract.growth.course.rhythm.remove)
    remove() {
        return implement(contract.growth.course.rhythm.remove).handler(({ input }) =>
            this.rhythms.remove(input.id)
        );
    }
}
