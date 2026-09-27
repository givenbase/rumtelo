/**
 * Household money archive — Rumtelo JSON export restore (dry-run → confirm).
 * Zod only — no `export type` alone.
 */

import { z } from 'zod';

import { Cadence, FlowDirection } from '../../../../common/common.enums';
import { HouseholdScoped, Id, IsoDate, Money } from '../../../../common/common.schema';
import {
    DebtKind,
    DebtScheduleKind,
    GoalKind,
    GoalStatus,
    IncomeKind,
    JarKey,
    RuleField,
    RuleMatcher,
} from '../enums';

/** Loose export jar row — foreign ids ignored; `key` remaps onto this household. */
export const ArchiveJar = z
    .object({
        id: Id.optional(),
        key: z.enum(JarKey),
        name: z.string().min(1).max(80).optional(),
        percentage: z.number().min(0).max(100),
    })
    .passthrough();

export const ArchiveIncome = z
    .object({
        name: z.string().min(1).max(120),
        kind: z.enum(IncomeKind),
        amount: Money,
        cadence: z.enum(Cadence).optional(),
        expectedDay: z.int().min(1).max(31).nullish(),
        isActive: z.boolean().optional(),
        startedOn: IsoDate.nullish(),
        endsOn: IsoDate.nullish(),
    })
    .passthrough();

export const ArchiveFixedCost = z
    .object({
        id: Id.optional(),
        jarId: Id,
        name: z.string().min(1).max(120),
        amount: Money,
        cadence: z.enum(Cadence).optional(),
        direction: z.enum(FlowDirection).optional(),
        debtId: Id.nullish(),
        counterparty: z.string().max(160).nullish(),
        dueDay: z.int().min(1).max(31).nullish(),
        isActive: z.boolean().optional(),
        startedOn: IsoDate.nullish(),
        endsOn: IsoDate.nullish(),
        note: z.string().max(500).nullish(),
    })
    .passthrough();

export const ArchiveDebt = z
    .object({
        id: Id.optional(),
        name: z.string().min(1).max(120),
        kind: z.enum(DebtKind),
        balance: Money,
        originalBalance: Money.optional(),
        interestRate: z.number().min(0).max(100),
        minimumPayment: Money.optional(),
        extraPayment: Money.optional(),
        dueDay: z.int().min(1).max(31).nullish(),
        closedOn: IsoDate.nullish(),
        startedOn: IsoDate.nullish(),
        scheduleKind: z.enum(DebtScheduleKind).optional(),
        paymentCadence: z.enum(Cadence).optional(),
        termPayments: z.int().positive().nullish(),
        maturityOn: IsoDate.nullish(),
    })
    .passthrough();

export const ArchiveGoal = z
    .object({
        name: z.string().min(1).max(120),
        kind: z.enum(GoalKind).optional(),
        jarId: Id.nullish(),
        target: Money,
        monthlyContribution: Money.optional(),
        targetOn: IsoDate.nullish(),
        status: z.enum(GoalStatus).optional(),
        why: z.string().max(500).nullish(),
        icon: z.string().max(8).nullish(),
    })
    .passthrough();

export const ArchiveRule = z
    .object({
        field: z.enum(RuleField),
        matcher: z.enum(RuleMatcher),
        matchValue: z.string().min(1).max(200),
        jarId: Id,
        categoryId: Id.nullish(),
        priority: z.int().optional(),
        isActive: z.boolean().optional(),
    })
    .passthrough();

export const ArchiveTransaction = z
    .object({
        bookedOn: IsoDate,
        amount: Money,
        description: z.string().min(1).max(280),
        counterparty: z.string().max(160).nullish(),
        jarId: Id.nullish(),
        note: z.string().max(500).nullish(),
    })
    .passthrough();

/** Body of a Rumtelo settings JSON export (foreign household ids ignored). */
export const ArchiveRestorePayload = z.object({
    exportedAt: z.string().optional(),
    householdId: z.string().optional(),
    jars: z.array(ArchiveJar).default([]),
    income: z.array(ArchiveIncome).default([]),
    fixedCosts: z.array(ArchiveFixedCost).default([]),
    debts: z.array(ArchiveDebt).default([]),
    goals: z.array(ArchiveGoal).default([]),
    rules: z.array(ArchiveRule).default([]),
    transactions: z.array(ArchiveTransaction).default([]),
});

export const ArchiveRestoreInput = HouseholdScoped.extend({
    payload: ArchiveRestorePayload,
    /** Preview only when true (default). */
    dryRun: z.boolean().default(true),
    /** Apply jar % from the archive when they sum to 100. */
    applyJarSplit: z.boolean().default(true),
});

export const ArchiveSectionCounts = z.object({
    willImport: z.int(),
    skipped: z.int(),
    skippedPlan: z.int().default(0),
});

export const ArchiveRestoreResult = z.object({
    dryRun: z.boolean(),
    jarsSplitUpdated: z.boolean(),
    income: ArchiveSectionCounts,
    fixedCosts: ArchiveSectionCounts,
    debts: ArchiveSectionCounts,
    goals: ArchiveSectionCounts,
    rules: ArchiveSectionCounts,
    transactions: ArchiveSectionCounts,
    warnings: z.array(z.string()),
    sample: z.array(z.string()),
});

export type ArchiveRestorePayload = z.infer<typeof ArchiveRestorePayload>;
export type ArchiveRestoreInput = z.infer<typeof ArchiveRestoreInput>;
export type ArchiveRestoreResult = z.infer<typeof ArchiveRestoreResult>;
export type ArchiveSectionCounts = z.infer<typeof ArchiveSectionCounts>;
