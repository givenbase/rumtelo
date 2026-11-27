import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { ProgressService } from './progress.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/progress', 'public')
export class ProgressController {
    constructor(@Inject(ProgressService) private readonly progress: ProgressService) {}

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Board stage and the facts behind it for the active household. Read-only. */
    @Implement(contract.money.progress.get)
    get() {
        return implement(contract.money.progress.get).handler(() => this.progress.get());
    }
}
