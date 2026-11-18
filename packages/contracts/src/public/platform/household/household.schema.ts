/**
 * Household Schemas
 * Isolation boundary — every financial row carries householdId.
 * Backed by better-auth organization plugin for invites/roles.
 */

import { z } from 'zod';

import { Currency, Locale } from '../../../common/common.enums';
import { HouseholdId, Id, Money, MemberId, UserId } from '../../../common/common.schema';
import { PlanKey } from '../../../enums';
import {
    BoardStage,
    HouseholdRelation,
    HouseholdRole,
    IncomeStability,
    SpendingStyle,
} from '../enums';
import { JarKey, PayoffStrategy } from '../../product/money/enums';
import { HouseholdVisibilitySettings } from './visibility';

export {
    HouseholdRelation,
    HouseholdRole,
    IncomeStability,
    JarExperience,
    SpendingStyle,
} from '../enums';

/**
 * Stable keys inside {@link HouseholdAnswers} for onboarding / jar-bank setup.
 * Values stay primitives; enums are stored as their string members.
 */
export const HouseholdAnswerKey = {
    JAR_EXPERIENCE: 'jar_experience',
    /** True when the post-onboard bank + jar placement wizard finished or was skipped. */
    JAR_BANK_SETUP_DONE: 'jar_bank_setup_done',
    /** True once an OWNER hid the week-1 checklist on Home (hidden for every member). */
    WEEK1_CHECKLIST_DISMISSED: 'week1_checklist_dismissed',
} as const;

export type HouseholdAnswerKey = (typeof HouseholdAnswerKey)[keyof typeof HouseholdAnswerKey];

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
    /**
     * Who they are to this board (`auth.member.relation` BA additionalField).
     * Null only for legacy seats before the column existed.
     */
    relation: z.enum(HouseholdRelation).nullable(),
    /** Better Auth display name (`user.name`) — mapped via Account→User. */
    displayName: z.string(),
    email: z.email(),
    /** Better Auth may store absolute URLs or leave null. */
    image: z.string().nullable(),
    /**
     * Latest Better Auth session activity (`session.updated_at` max).
     * Null when the member has never had a session row.
     */
    lastSeenAt: z.iso.datetime().nullable(),
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
    /** Growth Course: show the quarter layer between goals and month. */
    isCourseQuartersEnabled: z.boolean(),
    /** Growth Course: show the day layer under the week. */
    isCourseDaysEnabled: z.boolean(),
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
    currency: z.enum(Currency),
    /**
     * Product tier for the board — Basic / Plus / Max.
     * Stored on `auth.household_billing`; composed into this DTO for the app.
     */
    planKey: z.enum(PlanKey),
    money: HouseholdMoneySettings,
    weekCheck: HouseholdWeekCheckSettings,
    features: HouseholdFeatureSettings,
    /** Who may see person-attributed rows (OWNER writes; Plus+ applies it). */
    visibility: HouseholdVisibilitySettings,
    answers: HouseholdAnswers,
    /**
     * Lifestyle tags (student, renter, homeowner, …) — `Audience.key` catalog
     * rows. Drives bill-picker recommendations across the board; empty = no
     * preference, everything shows.
     */
    audienceKeys: z.array(z.string()),
    /** When the Better Auth household (organization) was created. */
    createdAt: z.iso.datetime(),
    /** When household board setup completed; null = incomplete. */
    onboardedAt: z.iso.datetime().nullable(),
    /**
     * Lowest board stage this household shows, whatever its data says. Server-written only
     * (never in {@link HouseholdSettingsPatch}); null = derived from board data only.
     */
    boardStageFloor: z.enum(BoardStage).nullable(),
});

/** Partial nested patch for updateSettings (deep-merge on the server). */
export const HouseholdSettingsPatch = z.object({
    householdId: HouseholdId,
    why: z.string().max(500).nullable().optional(),
    currency: z.enum(Currency).optional(),
    planKey: z.enum(PlanKey).optional(),
    money: HouseholdMoneySettings.partial().optional(),
    weekCheck: HouseholdWeekCheckSettings.partial().optional(),
    features: HouseholdFeatureSettings.partial().optional(),
    /** `mode` merges; `areas` replaces the whole map so "back to default" can drop keys. */
    visibility: HouseholdVisibilitySettings.partial().optional(),
    answers: HouseholdAnswers.optional(),
    /** Whole-array replace — the picker always sends the full selection. */
    audienceKeys: z.array(z.string()).optional(),
});

/**
 * Seat use as the server counts it for invites: members plus pending, unexpired invitations.
 * Counts only: no e-mails, no names.
 */
export const HouseholdSeatUsage = z.object({
    /** Seats held by members (the owner counts as one). */
    members: z.int().min(1),
    /** Pending invitations that have not expired. */
    pendingInvites: z.int().min(0),
    /** Members plus pending invites in OWNER / MEMBER roles. */
    writableUsed: z.int().min(0),
    /** Members plus pending invites in the VIEWER role. */
    viewerUsed: z.int().min(0),
    /** Effective caps after seat add-ons; null = unlimited. */
    maxMembers: z.int().nullable(),
    maxWritable: z.int().nullable(),
    maxViewer: z.int().nullable(),
});

/** One jar's share in a custom split (percent, at most 2 decimals). */
export const JarSplitShare = z.object({
    key: z.enum(JarKey),
    /** Percent with at most 2 decimals (e.g. 55, 12.5). */
    percentage: z.number().min(0).max(100).multipleOf(0.01),
});

/**
 * Onboarding writes household + income + six jars + prefs + one "Main account"
 * (no bank, no IBAN, every jar placed on it) in one transaction.
 */
export const OnboardingInput = z.object({
    /** Optional: blank / omitted falls back to a localized "My household" on the server. */
    householdName: z.string().max(120).optional(),
    currency: z.enum(Currency).default(Currency.EUR),
    /** Creator's language — stored on their AccountSettings, not the board. */
    locale: z.enum(Locale).default(Locale.NL),
    /** Creator's money style — person-scoped AccountSettings. */
    spendingStyle: z.enum(SpendingStyle).default(SpendingStyle.UNKNOWN),
    /** Board income volatility (stable vs variable). */
    incomeStability: z.enum(IncomeStability).default(IncomeStability.STABLE),
    /** Board debt payoff default (optional at onboard). */
    payoffStrategy: z.enum(PayoffStrategy).default(PayoffStrategy.AVALANCHE),
    /** Net monthly income in integer minor units; 0 = no income yet (no income source is made). */
    monthlyNetIncome: z.int().min(0).max(100_000_000),
    /**
     * Optional custom split: every JarKey exactly once, total exactly 100.00.
     * Omitted = the jar template defaults, the same split `previewSplit` shows.
     */
    split: z.array(JarSplitShare).length(6).optional(),
    why: z.string().max(500).nullable().default(null),
});

/** Input for the onboarding split preview — nothing is written, no household needed. */
export const OnboardingSplitPreviewInput = z.object({
    currency: z.enum(Currency),
    /** Net monthly income in integer minor units. 0 is allowed (no income yet). */
    monthlyNetIncome: z.int().min(0).max(100_000_000),
    /** Optional custom split: every JarKey exactly once, total exactly 100. Omitted = jar template defaults. */
    split: z.array(JarSplitShare).length(6).optional(),
});

/** Income split into the six jars, in jar template `sortOrder`. */
export const OnboardingSplitPreview = z.object({
    currency: z.enum(Currency),
    monthlyNetIncome: Money,
    /** The sum of `amount` always equals `monthlyNetIncome`. */
    jars: z
        .array(z.object({ key: z.enum(JarKey), percentage: z.number(), amount: Money }))
        .length(6),
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
export type HouseholdSeatUsage = z.infer<typeof HouseholdSeatUsage>;
export type JarSplitShare = z.infer<typeof JarSplitShare>;
export type OnboardingInput = z.infer<typeof OnboardingInput>;
export type OnboardingSplitPreviewInput = z.infer<typeof OnboardingSplitPreviewInput>;
export type OnboardingSplitPreview = z.infer<typeof OnboardingSplitPreview>;
