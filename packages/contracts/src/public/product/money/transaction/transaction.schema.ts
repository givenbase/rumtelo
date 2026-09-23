/**
 * Transaction Schemas
 * Ledger entries, manual accounts, import pipeline.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import {
    HouseholdId,
    Id,
    IsoDate,
    Money,
    Pagination,
    PeriodKey,
} from '../../../../common/common.schema';
import { AccountKind, TransactionSource, TransactionStatus } from '../enums';

// ====================================================================
// Transactions
// ====================================================================

/**
 * INBOX  — arrived, not yet given a jar. The only state that demands user attention.
 * SORTED — has a jar (and usually a category).
 * IGNORED— deliberately excluded from budget maths (internal transfers, corrections).
 */
export const Transaction = z.object({
    id: Id,
    householdId: HouseholdId,
    accountId: Id.nullable(),
    jarId: Id.nullable(),
    categoryId: Id.nullable(),
    /**
     * When set, this outflow counts as a payment toward that debt
     * (balance was reduced when the link was established).
     */
    debtId: Id.nullable(),
    /**
     * When set, this row settles a fixed-cost period (see FixedCostSettlement).
     * Mutually exclusive with debtId on sort in MVP.
     */
    fixedCostId: Id.nullable(),
    /** Negative = money out, positive = money in. Minor units. */
    amount: Money,
    bookedOn: IsoDate,
    description: z.string().max(280),
    counterparty: z.string().max(160).nullable(),
    /**
     * Stable Transaction In source tag (e.g. GIFT, REFUND).
     * Null for Out / free-typed In / bank imports.
     */
    inflowKey: z.string().min(1).max(64).nullable(),
    status: z.enum(TransactionStatus),
    source: z.enum(TransactionSource),
    /** Set when a rule auto-sorted this, so the user can see and undo the automation. */
    appliedRuleId: Id.nullable(),
    /**
     * MerchantPreset.key that auto-sorted this when no household rule matched.
     * Null when a rule won, the user sorted by hand, or nothing matched.
     */
    appliedMerchantKey: z.string().min(1).max(64).nullable(),
    note: z.string().max(500).nullable(),
    createdAt: z.iso.datetime(),
});

export const ListTransactions = Pagination.extend({
    householdId: HouseholdId,
    period: PeriodKey.nullish(),
    status: z.enum(TransactionStatus).nullish(),
    jarId: Id.nullish(),
    debtId: Id.nullish(),
    search: z.string().max(120).nullish(),
});

export const CreateTransaction = z.object({
    householdId: HouseholdId,
    accountId: Id.nullish(),
    jarId: Id.nullish(),
    categoryId: Id.nullish(),
    debtId: Id.nullish(),
    fixedCostId: Id.nullish(),
    amount: Money,
    bookedOn: IsoDate,
    description: z.string().min(1).max(280),
    counterparty: z.string().max(160).nullish(),
    /** Set when logging In from a known preset — omit/null for Out or custom labels. */
    inflowKey: z.string().min(1).max(64).nullish(),
    note: z.string().max(500).nullish(),
});

/** Sorting one inbox item; optionally teach a rule from it in the same call. */
export const SortTransaction = z.object({
    householdId: HouseholdId,
    transactionId: Id,
    jarId: Id,
    categoryId: Id.nullish(),
    /** Link this outflow as a debt payment (reduces balance on first link). */
    debtId: Id.nullish(),
    /**
     * Link this row as settling a fixed cost for the booked month.
     * MVP: mutually exclusive with debtId on the same call.
     */
    fixedCostId: Id.nullish(),
    createRule: z.boolean().default(false),
});

// ====================================================================
// Accounts
// ====================================================================

export const Account = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(120),
    /** Optional; accept spaced input — server normalizes to electronic form. */
    iban: z.string().max(42).nullable(),
    kind: z.enum(AccountKind),
    balance: Money,
    /**
     * Catalog bank id (backoffice Bank) — always required.
     * Manual vs Open Banking is `connectionId` (null = manual entry at this bank).
     */
    bankId: Id,
    /**
     * Checking/savings account that pays this seat’s bill (credit cards).
     * Null until set. Connecting sync later does not change this link.
     */
    settlementAccountId: Id.nullable(),
    /**
     * Null = manual account at `bankId`; set when linked through bank sync
     * (`sessionId::accountUid` for Enable Banking — not a UUID).
     * Connecting later upgrades this row — do not create a second account for the same IBAN.
     */
    connectionId: z.string().min(1).max(120).nullable(),
    lastSyncedAt: z.iso.datetime().nullable(),
    /**
     * Household default seat (CSV labels / defaults). At most one true per household.
     */
    isPrimary: z.boolean(),
});

// ====================================================================
// Statement file import (CSV / MT940 / CAMT.053)
// ====================================================================

export const StatementImportFormat = z.enum(['auto', 'csv', 'mt940', 'camt053']);

export const ImportCsv = z.object({
    householdId: HouseholdId,
    accountId: Id,
    /** Raw statement text (CSV, MT940, or CAMT.053 XML). Format is sniffed when `format` is auto. */
    content: z.string().min(1),
    dryRun: z.boolean().default(true),
    format: StatementImportFormat.default('auto'),
});

export const ImportPreview = z.object({
    detected: z.int(),
    duplicates: z.int(),
    willImport: z.int(),
    /** Of the rows that land, how many a rule or the merchant catalog sorts immediately. */
    sorted: z.int(),
    sample: z.array(z.string()),
});

export const ImportCsvResult = z.object({
    imported: z.int(),
    skipped: z.int(),
    errors: z.array(z.string()),
});

// Inferred types (same-module merge for consumers)
export type Transaction = z.infer<typeof Transaction>;
export type ListTransactions = z.infer<typeof ListTransactions>;
export type CreateTransaction = z.infer<typeof CreateTransaction>;
export type SortTransaction = z.infer<typeof SortTransaction>;
export type Account = z.infer<typeof Account>;
export type ImportCsv = z.infer<typeof ImportCsv>;
export type ImportPreview = z.infer<typeof ImportPreview>;
export type ImportCsvResult = z.infer<typeof ImportCsvResult>;
export type StatementImportFormat = z.infer<typeof StatementImportFormat>;
