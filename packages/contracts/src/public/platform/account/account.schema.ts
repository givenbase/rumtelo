/**
 * Account Schemas
 * Application person profile on auth.account (+ settings / tour).
 * Display name lives on Better Auth user.name — seeded from first/last at signup,
 * then independently editable via AccountProfilePatch.displayName.
 */

import { z } from 'zod';

import { Locale, Theme } from '../../../common/common.enums';
import { Id, UserId } from '../../../common/common.schema';
import { OptionalNullableE164Phone } from '../../../common/phone.schema';
import { SpendingStyle, WorkSituation, YearIntention } from '../enums';

const PersonName = z.string().trim().min(1).max(80);
const OptionalPersonName = PersonName.nullable().optional();

// ====================================================================
// ? PROFILE
// ====================================================================

export const AccountProfile = z.object({
    accountId: Id,
    /** Better Auth user — linked via Account.user; keep for membership/session joins. */
    userId: UserId,
    /** Public nickname / how we greet you — Better Auth `user.name` (via Account→User). */
    displayName: z.string().trim().min(1).max(80),
    firstName: z.string().trim().max(80).nullable(),
    middleName: z.string().trim().max(80).nullable(),
    lastName: z.string().trim().max(80).nullable(),
    /** Stored E.164 when set; lenient on read for any legacy rows. */
    phone: z.string().trim().max(32).nullable(),
    /** ISO calendar date `YYYY-MM-DD`. */
    dateOfBirth: z.iso.date().nullable(),
    email: z.email(),
    image: z.string().nullable(),
});

export const AccountProfilePatch = z.object({
    displayName: PersonName.optional(),
    firstName: OptionalPersonName,
    middleName: OptionalPersonName,
    lastName: OptionalPersonName,
    phone: OptionalNullableE164Phone,
    dateOfBirth: z.iso.date().nullable().optional(),
});

/** Legal / contact fields only — used when creating or backfilling `auth.account`. */
export const AccountProfileSeed = AccountProfilePatch.omit({ displayName: true });

// ====================================================================
// ? SETTINGS / TOUR
// ====================================================================

export const AccountTourChapterStatus = z.enum(['completed', 'skipped']);

export const AccountTourOfferStatus = z.enum(['idle', 'pending', 'accepted', 'dismissed']);

/** Joyride progress — person-scoped so partners don’t overwrite each other. */
export const AccountTourProgress = z.object({
    offer: AccountTourOfferStatus,
    tours: z.record(z.string(), AccountTourChapterStatus),
    seriesActive: z.boolean(),
    seriesIndex: z.int().min(0),
});

export const DEFAULT_ACCOUNT_TOUR_PROGRESS = {
    offer: 'idle' as const,
    tours: {} as Record<string, z.infer<typeof AccountTourChapterStatus>>,
    seriesActive: false,
    seriesIndex: 0,
} satisfies z.infer<typeof AccountTourProgress>;

/** Longest `direction` / `directionWhy` text, in characters. */
export const ACCOUNT_DIRECTION_MAX_LENGTH = 280;

/**
 * One short personal sentence (the Mindset "direction"). Trimmed, at most 280 characters.
 * An empty string passes here on purpose: the service reads "empty after trim" as "cleared"
 * and stores null, so a form can send what the person typed.
 */
export const AccountDirectionText = z.string().trim().max(ACCOUNT_DIRECTION_MAX_LENGTH);

/**
 * Person UI prefs. Currency is NOT here — the household board has one accounting
 * currency. Theme, locale, spending style, work situation and year intention can differ between members.
 */
export const AccountSettings = z.object({
    accountId: Id,
    locale: z.enum(Locale),
    theme: z.enum(Theme),
    /** Soft spending style — personalises coach tips for who is looking. */
    spendingStyle: z.enum(SpendingStyle),
    /** How the person earns a living; null = not told. Orders goal presets in "Plan your year". */
    workSituation: z.enum(WorkSituation).nullable(),
    /** What the person wants from the year; null = not told. Sets the tone of "Plan your year". */
    yearIntention: z.enum(YearIntention).nullable(),
    /**
     * Where the person wants to be a year from now, in their own words; null = not written.
     * Personal: never shown to housemates or to a practice, and never part of a household
     * read. Patch: undefined leaves it, null (or empty after trim) clears it.
     */
    direction: AccountDirectionText.nullable(),
    /**
     * What the direction is for, in the person's own words; null = not written.
     * Personal, same privacy as `direction`. Patch: undefined leaves it, null clears it.
     */
    directionWhy: AccountDirectionText.nullable(),
    /** Guided tour / Help walkthrough progress. */
    tour: AccountTourProgress,
    /**
     * Skip the board ladder for this person (every household they are in). Default false.
     * Guidance only: plan and role still decide what exists.
     */
    showAllSurfaces: z.boolean(),
    /** When personal onboarding completed; null = still new. */
    onboardedAt: z.iso.datetime().nullable(),
});

// Inferred types (same-module merge for consumers)
export type AccountProfile = z.infer<typeof AccountProfile>;
export type AccountProfilePatch = z.infer<typeof AccountProfilePatch>;
export type AccountProfileSeed = z.infer<typeof AccountProfileSeed>;
export type AccountTourChapterStatus = z.infer<typeof AccountTourChapterStatus>;
export type AccountTourOfferStatus = z.infer<typeof AccountTourOfferStatus>;
export type AccountTourProgress = z.infer<typeof AccountTourProgress>;
export type AccountDirectionText = z.infer<typeof AccountDirectionText>;
export type AccountSettings = z.infer<typeof AccountSettings>;
