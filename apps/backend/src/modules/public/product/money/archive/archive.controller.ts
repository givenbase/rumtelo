import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import { ArchiveService } from './archive.service';

/** Transport only — restore a Rumtelo JSON export. */
@ControllerSwagger('money/archive', 'public')
export class ArchiveController {
    constructor(@Inject(ArchiveService) private readonly archive: ArchiveService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Dry-run or apply a household JSON archive restore. */
    @Implement(contract.money.archive.restore)
    restore() {
        return implement(contract.money.archive.restore).handler(({ input }) =>
            this.archive.restore({
                payload: input.payload,
                dryRun: input.dryRun,
                applyJarSplit: input.applyJarSplit,
                applySettings: input.applySettings,
            })
        );
    }
}
