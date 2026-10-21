import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../common/capability';
import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { CourseFeedService } from './course-feed.service';

/** Implements `contract.growth.course.feed` — the viewer's own calendar address. */
@ControllerSwagger('growth/course/feed', 'public')
@RequireCapability(CAPABILITIES.growthCourse)
export class CourseFeedController {
    constructor(@Inject(CourseFeedService) private readonly feeds: CourseFeedService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    @Implement(contract.growth.course.feed.get)
    get() {
        return implement(contract.growth.course.feed.get).handler(() => this.feeds.get());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    @Implement(contract.growth.course.feed.enable)
    enable() {
        return implement(contract.growth.course.feed.enable).handler(() => this.feeds.enable());
    }

    @Implement(contract.growth.course.feed.update)
    update() {
        return implement(contract.growth.course.feed.update).handler(({ input }) =>
            this.feeds.update(input)
        );
    }

    @Implement(contract.growth.course.feed.rotate)
    rotate() {
        return implement(contract.growth.course.feed.rotate).handler(() => this.feeds.rotate());
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    @Implement(contract.growth.course.feed.disable)
    disable() {
        return implement(contract.growth.course.feed.disable).handler(() => this.feeds.disable());
    }
}
