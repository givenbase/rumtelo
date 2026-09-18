import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';
import { contract, type SpendingStyle } from '@rumtelo/contracts';

import { ControllerSwagger } from '../../../../../common/decorators/controller-swagger.decorators';
import {
    BookPresetService,
    IncomePostureService,
    LeverPresetService,
    WatchPresetService,
    WealthStageService,
} from '../../../../backoffice/product';

@ControllerSwagger('growth/catalogs', 'public')
export class GrowthCatalogsController {
    constructor(
        @Inject(LeverPresetService) private readonly levers: LeverPresetService,
        @Inject(BookPresetService) private readonly books: BookPresetService,
        @Inject(WatchPresetService) private readonly watches: WatchPresetService,
        @Inject(IncomePostureService) private readonly postures: IncomePostureService,
        @Inject(WealthStageService) private readonly stages: WealthStageService
    ) {}

    @Implement(contract.growth.catalogs.incomePostures.list)
    listIncomePostures() {
        return implement(contract.growth.catalogs.incomePostures.list).handler(async () =>
            this.postures.listActive()
        );
    }

    @Implement(contract.growth.catalogs.wealthStages.list)
    listWealthStages() {
        return implement(contract.growth.catalogs.wealthStages.list).handler(async () =>
            this.stages.listActive()
        );
    }

    @Implement(contract.growth.catalogs.leverPresets.list)
    listLeverPresets() {
        return implement(contract.growth.catalogs.leverPresets.list).handler(async ({ input }) =>
            this.levers.listActive({
                postureKey: input.postureKey ?? undefined,
                spendingStyle: (input.spendingStyle as SpendingStyle | null) ?? undefined,
                stageKey: input.stageKey ?? undefined,
            })
        );
    }

    @Implement(contract.growth.catalogs.bookPresets.list)
    listBookPresets() {
        return implement(contract.growth.catalogs.bookPresets.list).handler(async () =>
            this.books.listActive()
        );
    }

    @Implement(contract.growth.catalogs.watchPresets.list)
    listWatchPresets() {
        return implement(contract.growth.catalogs.watchPresets.list).handler(async () =>
            this.watches.listActive()
        );
    }
}
