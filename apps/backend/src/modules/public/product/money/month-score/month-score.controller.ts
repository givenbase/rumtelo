import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { currentPeriod } from '../../../../../common/utils/period.util';
import { MonthScoreService } from './month-score.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/month-score', 'public')
export class MonthScoreController {
    constructor(@Inject(MonthScoreService) private readonly monthScores: MonthScoreService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return (or build) the current period's month score and events. */
    @Implement(contract.money.monthScore.current)
    current() {
        return implement(contract.money.monthScore.current).handler(({ input }) =>
            this.monthScores.current(input.period ?? currentPeriod())
        );
    }

    /** Static level definitions with thresholds and unlocks. */
    @Implement(contract.money.monthScore.levels)
    levels() {
        return implement(contract.money.monthScore.levels).handler(async () =>
            this.monthScores.levels()
        );
    }

    /** Period recap: income, spent, leftOver, score, best/worst jar. */
    @Implement(contract.money.monthScore.recap)
    recap() {
        return implement(contract.money.monthScore.recap).handler(({ input }) =>
            this.monthScores.recap(input.period)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Finalise a period month score; idempotent if already closed. */
    @Implement(contract.money.monthScore.close)
    close() {
        return implement(contract.money.monthScore.close).handler(({ input }) =>
            this.monthScores.close(input.period, input.billDispositions ?? [])
        );
    }
}
