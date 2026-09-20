import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { TimeTemplateService } from './time-template.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('energy/time-templates', 'public')
export class TimeTemplateController {
    constructor(@Inject(TimeTemplateService) private readonly templates: TimeTemplateService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Upsert the current person's typical workday and day off. */
    @Implement(contract.energy.timeTemplates.create)
    create() {
        return implement(contract.energy.timeTemplates.create).handler(({ input }) =>
            this.templates.create(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** The current person's templates with learned medians. */
    @Implement(contract.energy.timeTemplates.list)
    list() {
        return implement(contract.energy.timeTemplates.list).handler(() => this.templates.list());
    }
}
