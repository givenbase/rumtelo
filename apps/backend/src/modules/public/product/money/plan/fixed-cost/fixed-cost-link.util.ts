import { type EntityManager } from '@mikro-orm/postgresql';
import { apiBadRequest } from '../../../../../../common/errors/api-user-error';

import {
    FixedCostSettlementSource,
    FixedCostSettlementStatus,
    FlowDirection,
} from '@rumtelo/contracts';
import { isFixedCostCounting } from '@rumtelo/utils';

import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { type Transaction } from '../../ledger/transaction/transaction.entity';
import { FixedCost } from './fixed-cost.entity';
import { FixedCostSettlement } from './fixed-cost-settlement.entity';

/** Calendar month key from an ISO date (`YYYY-MM-DD` → `YYYY-MM`). */
export function periodFromBookedOn(bookedOn: string): string {
    return bookedOn.slice(0, 7);
}

function assertDirectionMatches(fixedCost: FixedCost, amount: number) {
    if (fixedCost.direction === FlowDirection.OUT && amount >= 0) {
        throw apiBadRequest('bill_link_outflow');
    }
    if (fixedCost.direction === FlowDirection.IN && amount <= 0) {
        throw apiBadRequest('bill_link_inflow');
    }
}

/**
 * Link or unlink a transaction as settling a fixed-cost period.
 * Upserts PAID settlement for the booked month; reopening deletes LINKED/MATCHED
 * settlements when the tx was the only evidence.
 */
export async function applyFixedCostLinkChange(
    em: EntityManager,
    transaction: Transaction,
    nextFixedCostId: string | null | undefined,
    options?: { source?: FixedCostSettlementSource }
) {
    if (nextFixedCostId === undefined) return;

    const previousId = transaction.fixedCost?.id ?? null;
    if (previousId === nextFixedCostId) {
        if (nextFixedCostId) {
            await attachTransactionToSettlement(
                em,
                transaction,
                nextFixedCostId,
                options?.source ?? FixedCostSettlementSource.LINKED
            );
        }
        return;
    }

    if (previousId) {
        await detachTransactionSettlement(em, transaction, previousId);
    }

    if (nextFixedCostId) {
        const fixedCost = await em.findOneOrFail(FixedCost, {
            id: nextFixedCostId,
            household: currentHouseholdId(),
        });
        if (!isFixedCostCounting(fixedCost)) {
            throw apiBadRequest('bill_paused_no_settlement');
        }
        assertDirectionMatches(fixedCost, transaction.amount);
        transaction.fixedCost = fixedCost;
        await attachTransactionToSettlement(
            em,
            transaction,
            nextFixedCostId,
            options?.source ?? FixedCostSettlementSource.LINKED
        );
        return;
    }

    transaction.fixedCost = null;
}

async function detachTransactionSettlement(
    em: EntityManager,
    transaction: Transaction,
    fixedCostId: string
) {
    const period = periodFromBookedOn(transaction.bookedOn);
    const settlement = await em.findOne(FixedCostSettlement, {
        fixedCost: fixedCostId,
        period,
        household: currentHouseholdId(),
    });
    if (!settlement) {
        transaction.fixedCost = null;
        return;
    }

    const linkedHere = settlement.transaction?.id === transaction.id;
    if (linkedHere) {
        settlement.transaction = null;
    }

    const linkedOnly =
        settlement.source === FixedCostSettlementSource.LINKED ||
        settlement.source === FixedCostSettlementSource.MATCHED;

    if (linkedOnly && !settlement.transaction) {
        em.remove(settlement);
    }

    transaction.fixedCost = null;
}

async function attachTransactionToSettlement(
    em: EntityManager,
    transaction: Transaction,
    fixedCostId: string,
    source: FixedCostSettlementSource
) {
    const period = periodFromBookedOn(transaction.bookedOn);
    let settlement = await em.findOne(FixedCostSettlement, {
        fixedCost: fixedCostId,
        period,
        household: currentHouseholdId(),
    });

    const paidAt = new Date(`${transaction.bookedOn}T12:00:00.000Z`);
    const amount = Math.abs(transaction.amount);

    if (settlement) {
        settlement.status = FixedCostSettlementStatus.PAID;
        settlement.source = source;
        settlement.paidAt = settlement.paidAt ?? paidAt;
        settlement.amount = amount;
        settlement.transaction = transaction;
        return;
    }

    settlement = em.create(FixedCostSettlement, {
        household: currentHouseholdId(),
        fixedCost: em.getReference(FixedCost, fixedCostId),
        period,
        status: FixedCostSettlementStatus.PAID,
        source,
        paidAt,
        amount,
        transaction,
        note: null,
    } as never);
    em.persist(settlement);
}

/** Clear fixed-cost link when a transaction is deleted or ignored. */
export async function clearFixedCostLinkOnTransaction(em: EntityManager, transaction: Transaction) {
    if (!transaction.fixedCost) return;
    await applyFixedCostLinkChange(em, transaction, null);
}
