import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../common/decorators/controller-swagger.decorators';
import { currentPeriod } from '../../../../common/utils/period.util';
import { CoachService } from './coach.service';
import { CoachSessionService } from './coach-session.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('coach', 'public')
export class CoachController {
    constructor(
        @Inject(CoachService) private readonly coach: CoachService,
        @Inject(CoachSessionService) private readonly sessions: CoachSessionService
    ) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return active coach messages for the given period. */
    @Implement(contract.coach.feed)
    feed() {
        return implement(contract.coach.feed).handler(({ input }) =>
            this.coach.feed(input.period ?? currentPeriod())
        );
    }

    /** Smart fill queue — missing money / energy / soul answers for this visit. */
    @Implement(contract.coach.session)
    session() {
        return implement(contract.coach.session).handler(() => this.sessions.session());
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Mark a coach message as dismissed. */
    @Implement(contract.coach.dismiss)
    dismiss() {
        return implement(contract.coach.dismiss).handler(async ({ input }) => {
            await this.coach.dismiss(input.id);
            return { ok: true as const };
        });
    }
}
