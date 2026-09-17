import { type EntityManager } from '@mikro-orm/postgresql';

import { currentHouseholdId } from '../../../../../../common/household/household.context';
import { type Transaction } from '../../ledger/transaction/transaction.entity';
import { Debt } from './debt.entity';

/**
 * Apply a signed ledger amount to the debt balance.
 * Outflows (negative) reduce balance; removing a payment (positive restore) raises it.
 */
export function applyDebtBalanceDelta(debt: Debt, signedAmount: number) {
    const next = Math.max(0, Number(debt.balance) + signedAmount);
    debt.balance = next;
    if (next <= 0) {
        debt.closedOn = debt.closedOn ?? new Date().toISOString().slice(0, 10);
    } else if (debt.closedOn) {
        debt.closedOn = null;
    }
}

/** Link or unlink a transaction as a debt payment; adjusts balance only on change. */
export async function applyDebtLinkChange(
    em: EntityManager,
    transaction: Transaction,
    nextDebtId: string | null | undefined
) {
    if (nextDebtId === undefined) return;

    const previousId = transaction.debt?.id ?? null;
    if (previousId === nextDebtId) return;

    if (previousId) {
        const previous = await em.findOne(Debt, {
            id: previousId,
            household: currentHouseholdId(),
        });
        if (previous) {
            // Restore what this outflow took off the balance (outflow is negative).
            applyDebtBalanceDelta(previous, -Number(transaction.amount));
        }
    }

    if (nextDebtId) {
        const next = await em.findOneOrFail(Debt, {
            id: nextDebtId,
            household: currentHouseholdId(),
        });
        transaction.debt = next;
        applyDebtBalanceDelta(next, Number(transaction.amount));
        return;
    }

    transaction.debt = null;
}
