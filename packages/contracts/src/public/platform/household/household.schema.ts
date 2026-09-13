/**
 * Household Schemas
 * Isolation boundary — every financial row carries householdId.
 * Backed by better-auth organization plugin for invites/roles.
 */

import { z } from 'zod';

import { Currency, Locale } from '../../../common/common.enums';
import { HouseholdId, Id, MemberId, UserId } from '../../../common/common.schema';
import { PlanKey } from '../../../enums';
import { HouseholdKind, HouseholdRole, IncomeStability, SpendingStyle } from '../enums';
import { PayoffStrategy } from '../../product/money/enums';

export { HouseholdKind, HouseholdRole, IncomeStability, SpendingStyle } from '../enums';

export const Household = z.object({
    id: HouseholdId,
    name: z.string().min(1).max(120),
    /** Unique human-readable handle (Better Auth organization.slug). Scoping uses `id`. */
    slug: z.string().min(1).max(120),
    /** Accounting currency for the board — shared by every member. */
    currency: z.enum(Currency),
    /** Day of month the budget period rolls over. 1 for most, 25 for salary-day budgeters. */
    periodStartDay: z.int().min(1).max(28),
    createdAt: z.iso.datetime(),
});

export const HouseholdMember = z.object({
    /** Better Auth `auth.member.id` — uuid (BA-owned, not Rumtelo {@link Id}). */
    id: MemberId,
    householdId: HouseholdId,
    /** Rumtelo `auth.account.id` — application person (profile / prefs). */
    accountId: Id,
    /** Better Auth `auth.user.id` — login identity (session / membership). */
    userId: UserId,
    role: z.enum(HouseholdRole),
    /** Better Auth display name (`user.name`) — mapped via Account→User. */
    displayName: z.string(),
    email: z.email(),
    /** Better Auth may store absolute URLs or leave null. */
    image: z.string().nullable(),
});

/** Shared money-board prefs (period, income picture, debt order). */
export const HouseholdMoneySettings = z.object({
    /** Budget rollover day. 1 for most, 25 for salary-day budgeters. */
    periodStartDay: z.int().min(1).max(28),
    /** How steady household inflow is — stable, variable, or none (~€0 net). */
    incomeStability: z.enum(IncomeStability),
    /** Avalanche / snowball / minimal — one order for the shared debt list. */
    payoffStrategy: z.enum(PayoffStrategy),
});

/** Week-check reminder — null day/at disables the nudge. */
export const HouseholdWeekCheckSettings = z.object({
    /** ISO weekday, 1 = Monday. */
    reminderDay: z.int().min(1).max(7).nullable(),
    /** Local time HH:mm. */
    reminderAt: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
        .nullable(),
});

/** Product feature toggles for the board. */
export const HouseholdFeatureSettings = z.object({
    isBankSyncEnabled: z.boolean(),
    isCoachEnabled: z.boolean(),
});

/**
 * Extensible household Q&A (onboarding / coach prompts).
 * Keys are stable question ids; values are primitives.
 */
export const HouseholdAnswers = z.record(
    z.string(),
    z.union([z.string(), z.number(), z.boolean(), z.null()])
);

/**
 * Money-board prefs for the household. Language, appearance, and spending style
 * live on AccountSettings — they can differ per person in the same household.
 *
 * Grouped: general identity → product → money / weekCheck / features bags → answers.
 * `onboardedAt` is set when `household.onboard` finishes (board + jars seeded).
 */
export const HouseholdSettings = z.object({
    householdId: HouseholdId,
    /** Surfaced on the dashboard as the "why" line. */
    why: z.string().max(500).nullable().optional(),
    kind: z.enum(HouseholdKind),
    currency: z.enum(Currency),
    /**
     * Product tier for the board — Basic / Plus / Max.
     * Stored on `auth.household_billing`; composed into this DTO for the app.
     */
    planKey: z.enum(PlanKey),
    money: HouseholdMoneySettings,
    weekCheck: HouseholdWeekCheckSettings,
    features: HouseholdFeatureSettings,
    answers: HouseholdAnswers,
    /** When household board setup completed; null = incomplete. */
    onboardedAt: z.iso.datetime().nullable(),
});

/** Partial nested patch for updateSettings (deep-merge on the server). */
export const HouseholdSettingsPatch = z.object({
    householdId: HouseholdId,
    why: z.string().max(500).nullable().optional(),
    kind: z.enum(HouseholdKind).optional(),
    currency: z.enum(Currency).optional(),
    planKey: z.enum(PlanKey).optional(),
    money: HouseholdMoneySettings.partial().optional(),
    weekCheck: HouseholdWeekCheckSettings.partial().optional(),
    features: HouseholdFeatureSettings.partial().optional(),
    answers: HouseholdAnswers.optional(),
});

/** Onboarding writes income + split + prefs in one transaction. */
export const OnboardingInput = z.object({
    householdName: z.string().min(1).max(120),
    kind: z.enum(HouseholdKind).default(HouseholdKind.SOLO),
    currency: z.enum(Currency).default(Currency.EUR),
    /** Creator's language — stored on their AccountSettings, not the board. */
    locale: z.enum(Locale).default(Locale.NL),
    /** Creator's money style — person-scoped AccountSettings. */
    spendingStyle: z.enum(SpendingStyle).default(SpendingStyle.UNKNOWN),
    /** Board income volatility (stable vs variable). */
    incomeStability: z.enum(IncomeStability).default(IncomeStability.STABLE),
    /** Board debt payoff default (optional at onboard). */
    payoffStrategy: z.enum(PayoffStrategy).default(PayoffStrategy.AVALANCHE),
    monthlyNetIncome: z.int().min(0),
    split: z.array(z.object({ key: z.string(), percentage: z.number().min(0).max(100) })),
    why: z.string().max(500).nullable().default(null),
});

// Inferred types (same-module merge for consumers)
export type Household = z.infer<typeof Household>;
export type HouseholdMember = z.infer<typeof HouseholdMember>;
export type HouseholdMoneySettings = z.infer<typeof HouseholdMoneySettings>;
export type HouseholdWeekCheckSettings = z.infer<typeof HouseholdWeekCheckSettings>;
export type HouseholdFeatureSettings = z.infer<typeof HouseholdFeatureSettings>;
export type HouseholdAnswers = z.infer<typeof HouseholdAnswers>;
export type HouseholdSettings = z.infer<typeof HouseholdSettings>;
export type HouseholdSettingsPatch = z.infer<typeof HouseholdSettingsPatch>;
export type OnboardingInput = z.infer<typeof OnboardingInput>;
