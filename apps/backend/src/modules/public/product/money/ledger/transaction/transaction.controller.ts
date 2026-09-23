import { CAPABILITIES, contract } from '@rumtelo/contracts';

import { Inject } from '@nestjs/common';
import { Implement, implement } from '@orpc/nest';

import { RequireCapability } from '../../../../../../common/capability';
import { ControllerSwagger } from '../../../../../../common/decorators/controller-swagger.decorators';
import { TransactionService } from './transaction.service';

/** Transport only. Handler order is always CRUD. */
@ControllerSwagger('money/transactions', 'public')
export class TransactionController {
    constructor(@Inject(TransactionService) private readonly transactions: TransactionService) {}

    // ====================================================================
    // ? CREATE Operations
    // ====================================================================

    /** Manually log a new transaction. */
    @Implement(contract.money.transactions.create)
    create() {
        return implement(contract.money.transactions.create).handler(({ input }) =>
            this.transactions.create(input)
        );
    }

    /** Bulk-import transactions from a bank statement (CSV / MT940 / CAMT.053). */
    @RequireCapability(CAPABILITIES.moneyImport)
    @Implement(contract.money.transactions.importCsv)
    importCsv() {
        return implement(contract.money.transactions.importCsv).handler(({ input }) =>
            this.transactions.importCsv(
                input.accountId,
                input.content,
                input.dryRun,
                input.format ?? 'auto'
            )
        );
    }

    // ====================================================================
    // ? READ Operations
    // ====================================================================

    /** Return unsorted transactions for the current household. */
    @Implement(contract.money.transactions.inbox)
    inbox() {
        return implement(contract.money.transactions.inbox).handler(() =>
            this.transactions.inbox()
        );
    }

    /** Paginated, optionally filtered transaction list. */
    @Implement(contract.money.transactions.list)
    list() {
        return implement(contract.money.transactions.list).handler(({ input }) =>
            this.transactions.list({
                status: input.status,
                jarId: input.jarId,
                debtId: input.debtId,
                limit: input.limit,
            })
        );
    }

    // ====================================================================
    // ? UPDATE Operations
    // ====================================================================

    /** Assign a single transaction to a jar (optionally creating a rule). */
    @Implement(contract.money.transactions.sort)
    sort() {
        return implement(contract.money.transactions.sort).handler(({ input }) =>
            this.transactions.sort(
                input.transactionId,
                input.jarId,
                input.categoryId,
                input.createRule,
                input.debtId,
                input.fixedCostId
            )
        );
    }

    /** Assign multiple transactions to a jar in one call. */
    @Implement(contract.money.transactions.bulkSort)
    bulkSort() {
        return implement(contract.money.transactions.bulkSort).handler(({ input }) =>
            this.transactions.bulkSort(input.transactionIds, input.jarId, input.categoryId)
        );
    }

    /** Edit mutable fields on a transaction. */
    @Implement(contract.money.transactions.update)
    update() {
        return implement(contract.money.transactions.update).handler(({ input }) =>
            this.transactions.update(input.id, {
                description: input.description,
                amount: input.amount,
                note: input.note,
                status: input.status,
                counterparty: input.counterparty,
                inflowKey: input.inflowKey,
                categoryId: input.categoryId,
                debtId: input.debtId,
                fixedCostId: input.fixedCostId,
            })
        );
    }

    // ====================================================================
    // ? DELETE Operations
    // ====================================================================

    /** Permanently delete a transaction. */
    @Implement(contract.money.transactions.remove)
    remove() {
        return implement(contract.money.transactions.remove).handler(async ({ input }) => {
            await this.transactions.remove(input.id);
            return { ok: true as const };
        });
    }
}
