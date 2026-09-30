import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { IncomeService } from './income.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/income', 'public')
export class IncomeController {
    constructor(@Inject(IncomeService) private readonly income: IncomeService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Register a new income source. */
    @Implement(contract.money.income.create)
    create() {
        return implement(contract.money.income.create).handler(({ input }) =>
            this.income.create({
                name: input.name,
                presetKey: input.presetKey,
                counterparty: input.counterparty,
                merchantKey: input.merchantKey,
                partyId: input.partyId,
                saveParty: input.saveParty,
                assetId: input.assetId,
                bankId: input.bankId,
                accountId: input.accountId,
                kind: input.kind,
                amount: input.amount,
                cadence: input.cadence,
                expectedDay: input.expectedDay,
                isActive: input.isActive,
                startedOn: input.startedOn,
                endsOn: input.endsOn,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return income sources for the current household, optionally for one linked asset. */
    @Implement(contract.money.income.list)
    list() {
        return implement(contract.money.income.list).handler(({ input }) =>
            this.income.list(input.assetId)
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Edit mutable fields on an income source. */
    @Implement(contract.money.income.update)
    update() {
        return implement(contract.money.income.update).handler(({ input }) => {
            const { id, ...patch } = input;
            return this.income.update(id, patch);
        });
    }

    /** Distribute an income amount across jars according to the current split. */
    @Implement(contract.money.income.applySplit)
    applySplit() {
        return implement(contract.money.income.applySplit).handler(({ input }) =>
            this.income.applySplit(input.amount)
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Remove an income source. */
    @Implement(contract.money.income.remove)
    remove() {
        return implement(contract.money.income.remove).handler(({ input }) =>
            this.income.remove(input.id)
        );
    }
}
