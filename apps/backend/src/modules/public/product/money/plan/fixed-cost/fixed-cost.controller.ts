import { contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { FixedCostService } from './fixed-cost.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/fixed-costs', 'public')
export class FixedCostController {
    constructor(@Inject(FixedCostService) private readonly fixedCosts: FixedCostService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Add a new recurring fixed cost. */
    @Implement(contract.money.fixedCosts.create)
    create() {
        return implement(contract.money.fixedCosts.create).handler(({ input }) =>
            this.fixedCosts.create({
                jarId: input.jarId,
                categoryId: input.categoryId,
                debtId: input.debtId,
                assetId: input.assetId,
                name: input.name,
                presetKey: input.presetKey,
                counterparty: input.counterparty,
                merchantKey: input.merchantKey,
                partyId: input.partyId,
                saveParty: input.saveParty,
                amount: input.amount,
                cadence: input.cadence,
                dueDay: input.dueDay,
                dueMonth: input.dueMonth,
                direction: input.direction,
                isActive: input.isActive,
                startedOn: input.startedOn,
                endsOn: input.endsOn,
                note: input.note,
            })
        );
    }

    /** Mark a bill paid for a calendar month. */
    @Implement(contract.money.fixedCosts.markPaid)
    markPaid() {
        return implement(contract.money.fixedCosts.markPaid).handler(({ input }) =>
            this.fixedCosts.markPaid({
                fixedCostId: input.fixedCostId,
                period: input.period,
                paidAt: input.paidAt,
                amount: input.amount,
                transactionId: input.transactionId,
                note: input.note,
            })
        );
    }

    /** Skip a bill for a calendar month (intentionally not paid). */
    @Implement(contract.money.fixedCosts.skip)
    skip() {
        return implement(contract.money.fixedCosts.skip).handler(({ input }) =>
            this.fixedCosts.skip({
                fixedCostId: input.fixedCostId,
                period: input.period,
                note: input.note,
            })
        );
    }

    /** Register carried months as a debt; clears the rolled chain. */
    @Implement(contract.money.fixedCosts.convertArrearsToDebt)
    convertArrearsToDebt() {
        return implement(contract.money.fixedCosts.convertArrearsToDebt).handler(({ input }) =>
            this.fixedCosts.convertArrearsToDebt({
                fixedCostId: input.fixedCostId,
                period: input.period,
                collectionNoticeSent: input.collectionNoticeSent,
                collectionFees: input.collectionFees,
                scheduleKind: input.scheduleKind,
                paymentCadence: input.paymentCadence,
                termPayments: input.termPayments,
                maturityOn: input.maturityOn,
            })
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** List fixed costs, optionally filtered by direction and/or linked asset. */
    @Implement(contract.money.fixedCosts.list)
    list() {
        return implement(contract.money.fixedCosts.list).handler(({ input }) =>
            this.fixedCosts.list(input.direction, input.assetId)
        );
    }

    /** Fixed costs grouped by jar. */
    @Implement(contract.money.fixedCosts.byJar)
    byJar() {
        return implement(contract.money.fixedCosts.byJar).handler(() => this.fixedCosts.byJar());
    }

    /** Settlements for a bill and/or month. */
    @Implement(contract.money.fixedCosts.listSettlements)
    listSettlements() {
        return implement(contract.money.fixedCosts.listSettlements).handler(({ input }) =>
            this.fixedCosts.listSettlements({
                fixedCostId: input.fixedCostId,
                period: input.period,
            })
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Patch mutable fields on a fixed cost. */
    @Implement(contract.money.fixedCosts.update)
    update() {
        return implement(contract.money.fixedCosts.update).handler(({ input }) => {
            const { id, ...patch } = input;
            return this.fixedCosts.update(id, patch);
        });
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Delete a fixed cost. */
    @Implement(contract.money.fixedCosts.remove)
    remove() {
        return implement(contract.money.fixedCosts.remove).handler(({ input }) =>
            this.fixedCosts.remove(input.id)
        );
    }

    /** Remove a period settlement and clear any linked transaction. */
    @Implement(contract.money.fixedCosts.unlinkSettlement)
    unlinkSettlement() {
        return implement(contract.money.fixedCosts.unlinkSettlement).handler(({ input }) =>
            this.fixedCosts.unlinkSettlement(input.id)
        );
    }
}
