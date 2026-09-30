/**
 * Household money archive — Rumtelo JSON export restore (dry-run → confirm).
 * Zod only — no `export type` alone.
 */

import { z } from 'zod';

import { Cadence, Currency, FlowDirection, Locale, Theme } from '../../../../common/common.enums';
import { HouseholdScoped, Id, IsoDate, Money } from '../../../../common/common.schema';
import {
    HouseholdAnswers,
    HouseholdFeatureSettings,
    HouseholdKind,
    HouseholdMoneySettings,
    HouseholdWeekCheckSettings,
    SpendingStyle,
} from '../../../platform/household/household.schema';
import {
    AccountKind,
    DebtKind,
    DebtScheduleKind,
    GoalKind,
    GoalStatus,
    IncomeKind,
    JarKey,
    RuleField,
    RuleMatcher,
} from '../enums';

/**
 * Portable board prefs — no planKey / billing / onboardedAt / householdId.
 * Restored via household.updateSettings (never touches Stripe plan).
 */
export const ArchiveHouseholdSettings = z.object({
    why: z.string().max(500).nullable().optional(),
    kind: z.enum(HouseholdKind).optional(),
    currency: z.enum(Currency).optional(),
    money: HouseholdMoneySettings.partial().optional(),
    weekCheck: HouseholdWeekCheckSettings.partial().optional(),
    features: HouseholdFeatureSettings.partial().optional(),
    answers: HouseholdAnswers.optional(),
    audienceKeys: z.array(z.string()).optional(),
});

/**
 * Portable person prefs for the importing user only — no tour / onboardedAt.
 */
export const ArchiveAccountSettings = z.object({
    locale: z.enum(Locale).optional(),
    theme: z.enum(Theme).optional(),
    spendingStyle: z.enum(SpendingStyle).optional(),
});

/** Household-saved counterparty — restore by name (ids differ per household). */
export const ArchiveParty = z.looseObject({
    name: z.string().min(1).max(160),
    note: z.string().max(280).nullish(),
    aliases: z.array(z.string().min(1).max(160)).max(20).optional(),
    merchantKey: z.string().min(1).max(64).nullish(),
    color: z.string().max(64).nullish(),
    icon: z.string().max(8).nullish(),
    logoDomain: z.string().max(120).nullish(),
    website: z.string().max(240).nullish(),
});

/**
 * Bank seat stub — recreates a manual account so the household can reconnect.
 * Full IBAN is intentional (user’s own export). Never carry `connectionId`.
 */
export const ArchiveBankAccount = z.looseObject({
    name: z.string().min(1).max(120),
    kind: z.enum(AccountKind),
    /** Catalog Bank.key — remapped to local bankId on restore. */
    bankKey: z.string().min(1).max(64),
    /** Full electronic IBAN when known. */
    iban: z.string().max(42).nullish(),
    balance: Money.optional(),
    isPrimary: z.boolean().optional(),
    /** True when the export had an Open Banking link — reconnect after import. */
    wasConnected: z.boolean().optional(),
    /** Settlement seat by display name (credit cards). */
    settlementAccountName: z.string().max(120).nullish(),
});

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
    /** Board prefs (currency, debt strategy, audiences, …). */
    settings: ArchiveHouseholdSettings.optional(),
    /** Importer’s own locale / theme / spending style. */
    accountSettings: ArchiveAccountSettings.optional(),
    parties: z.array(ArchiveParty).default([]),
    accounts: z.array(ArchiveBankAccount).default([]),
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
    /** Apply portable board + account prefs when present (default). */
    applySettings: z.boolean().default(true),
});

export const ArchiveSectionCounts = z.object({
    willImport: z.int(),
    skipped: z.int(),
    skippedPlan: z.int().default(0),
});

export const ArchiveRestoreResult = z.object({
    dryRun: z.boolean(),
    jarsSplitUpdated: z.boolean(),
    settings: ArchiveSectionCounts,
    accountSettings: ArchiveSectionCounts,
    parties: ArchiveSectionCounts,
    accounts: ArchiveSectionCounts,
    income: ArchiveSectionCounts,
    fixedCosts: ArchiveSectionCounts,
    debts: ArchiveSectionCounts,
    goals: ArchiveSectionCounts,
    rules: ArchiveSectionCounts,
    transactions: ArchiveSectionCounts,
    warnings: z.array(z.string()),
    sample: z.array(z.string()),
});

export type ArchiveHouseholdSettings = z.infer<typeof ArchiveHouseholdSettings>;
export type ArchiveAccountSettings = z.infer<typeof ArchiveAccountSettings>;
export type ArchiveParty = z.infer<typeof ArchiveParty>;
export type ArchiveBankAccount = z.infer<typeof ArchiveBankAccount>;
export type ArchiveRestorePayload = z.infer<typeof ArchiveRestorePayload>;
export type ArchiveRestoreInput = z.infer<typeof ArchiveRestoreInput>;
export type ArchiveRestoreResult = z.infer<typeof ArchiveRestoreResult>;
export type ArchiveSectionCounts = z.infer<typeof ArchiveSectionCounts>;
