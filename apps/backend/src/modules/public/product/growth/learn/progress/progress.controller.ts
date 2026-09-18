import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { ProgressService } from './progress.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('growth/learn/progress', 'public')
export class ProgressController {
    constructor(@Inject(ProgressService) private readonly progress: ProgressService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Put a piece on the shelf, or move one that is already there. */
    @Implement(contract.growth.learn.save)
    save() {
        return implement(contract.growth.learn.save).handler(({ input }) =>
            this.progress.save(input)
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** The signed-in person's shelf and focused skills. */
    @Implement(contract.growth.learn.list)
    list() {
        return implement(contract.growth.learn.list).handler(() => this.progress.list());
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Take a piece back off the shelf. */
    @Implement(contract.growth.learn.remove)
    remove() {
        return implement(contract.growth.learn.remove).handler(({ input }) =>
            this.progress.remove(input.pieceKey)
        );
    }
}
