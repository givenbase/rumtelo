/**
 * Transaction Contract
 * oRPC procedures for transactions (CRUD, sort, bulk-sort, CSV import) and accounts.
 */

import { oc } from '@orpc/contract';
import { z } from 'zod';

import { HouseholdId, HouseholdScoped, Id, paginated } from '../../../../common/common.schema';
import {
    Account,
    CreateTransaction,
    ImportCsv,
    ImportPreview,
    ListTransactions,
    SortTransaction,
    Transaction,
} from './transaction.schema';

const ok = z.object({ ok: z.literal(true) });

// ====================================================================
// ? CREATE Operations
// ====================================================================

export const transactionCreate = oc.input(CreateTransaction).output(Transaction);

export const accountCreate = oc
    .input(Account.omit({ id: true, connectionId: true, lastSyncedAt: true }))
    .output(Account);

// ====================================================================
// ? READ Operations
// ====================================================================

export const transactionList = oc.input(ListTransactions).output(paginated(Transaction));

export const transactionInbox = oc.input(HouseholdScoped).output(z.array(Transaction));

export const accountList = oc.input(HouseholdScoped).output(z.array(Account));

// ====================================================================
// ? UPDATE Operations
// ====================================================================

export const transactionUpdate = oc
    .input(Transaction.partial().extend({ id: Id, householdId: HouseholdId }))
    .output(Transaction);

export const accountUpdate = oc
    .input(
        Account.partial()
            .omit({ connectionId: true, lastSyncedAt: true, balance: true })
            .extend({ id: Id, householdId: HouseholdId })
    )
    .output(Account);

export const transactionSort = oc.input(SortTransaction).output(Transaction);

export const transactionBulkSort = oc
    .input(
        z.object({
            householdId: HouseholdId,
            transactionIds: z.array(Id).min(1),
            jarId: Id,
            categoryId: Id.nullish(),
        })
    )
    .output(z.object({ updated: z.int() }));

export const transactionImportCsv = oc.input(ImportCsv).output(ImportPreview);

// ====================================================================
// ? DELETE Operations
// ====================================================================

export const transactionRemove = oc
    .input(z.object({ householdId: HouseholdId, id: Id }))
    .output(ok);

export const accountRemove = oc.input(z.object({ householdId: HouseholdId, id: Id })).output(ok);

/** Nested contract object mounted at `contract.money.transactions`. */
export const transactionContract = {
    list: transactionList,
    inbox: transactionInbox,
    create: transactionCreate,
    update: transactionUpdate,
    sort: transactionSort,
    bulkSort: transactionBulkSort,
    remove: transactionRemove,
    importCsv: transactionImportCsv,
};

/** Nested contract object mounted at `contract.money.accounts`. */
export const accountsContract = {
    list: accountList,
    create: accountCreate,
    update: accountUpdate,
    remove: accountRemove,
};
