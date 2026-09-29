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
export const ArchiveJar = z.looseObject({
    id: Id.optional(),
    key: z.enum(JarKey),
    name: z.string().min(1).max(80).optional(),
    percentage: z.number().min(0).max(100),
});

export const ArchiveIncome = z.looseObject({
    name: z.string().min(1).max(120),
    presetKey: z.string().min(1).max(64).nullish(),
    counterparty: z.string().max(160).nullish(),
    merchantKey: z.string().min(1).max(64).nullish(),
    /** Party display name — restore relinks / saves by name (ids differ per household). */
    partyName: z.string().max(160).nullish(),
    kind: z.enum(IncomeKind),
    amount: Money,
    cadence: z.enum(Cadence).optional(),
    expectedDay: z.int().min(1).max(31).nullish(),
    isActive: z.boolean().optional(),
    startedOn: IsoDate.nullish(),
    endsOn: IsoDate.nullish(),
});

export const ArchiveFixedCost = z.looseObject({
    id: Id.optional(),
    jarId: Id,
    name: z.string().min(1).max(120),
    presetKey: z.string().min(1).max(64).nullish(),
    amount: Money,
    cadence: z.enum(Cadence).optional(),
    direction: z.enum(FlowDirection).optional(),
    debtId: Id.nullish(),
    counterparty: z.string().max(160).nullish(),
    dueDay: z.int().min(1).max(31).nullish(),
    dueMonth: z.int().min(1).max(12).nullish(),
    isActive: z.boolean().optional(),
    startedOn: IsoDate.nullish(),
    endsOn: IsoDate.nullish(),
    note: z.string().max(500).nullish(),
});

export const ArchiveDebt = z.looseObject({
    id: Id.optional(),
    name: z.string().min(1).max(120),
    presetKey: z.string().min(1).max(64).nullish(),
    kind: z.enum(DebtKind),
    balance: Money,
    originalBalance: Money.optional(),
    interestRate: z.number().min(0).max(100),
    minimumPayment: Money.optional(),
    extraPayment: Money.optional(),
    dueDay: z.int().min(1).max(31).nullish(),
    dueMonth: z.int().min(1).max(12).nullish(),
    closedOn: IsoDate.nullish(),
    startedOn: IsoDate.nullish(),
    scheduleKind: z.enum(DebtScheduleKind).optional(),
    paymentCadence: z.enum(Cadence).optional(),
    termPayments: z.int().positive().nullish(),
    maturityOn: IsoDate.nullish(),
});

export const ArchiveGoal = z.looseObject({
    name: z.string().min(1).max(120),
    kind: z.enum(GoalKind).optional(),
    jarId: Id.nullish(),
    target: Money,
    monthlyContribution: Money.optional(),
    targetOn: IsoDate.nullish(),
    status: z.enum(GoalStatus).optional(),
    why: z.string().max(500).nullish(),
    icon: z.string().max(8).nullish(),
});

export const ArchiveRule = z.looseObject({
    field: z.enum(RuleField),
    matcher: z.enum(RuleMatcher),
    matchValue: z.string().min(1).max(200),
    jarId: Id,
    categoryId: Id.nullish(),
    priority: z.int().optional(),
    isActive: z.boolean().optional(),
});

export const ArchiveTransaction = z.looseObject({
    bookedOn: IsoDate,
    amount: Money,
    description: z.string().min(1).max(280),
    counterparty: z.string().max(160).nullish(),
    jarId: Id.nullish(),
    note: z.string().max(500).nullish(),
});

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
