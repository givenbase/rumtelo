/**
 * Practice Schemas
 * B2B control-plane DTOs — Practice, address, members, client links, billing.
 */

import { z } from 'zod';

import { HouseholdId, Id } from '../../../common/common.schema';
import {
    PracticeAddressKind,
    PracticeClientAccess,
    PracticeClientControlFlag,
    PracticeClientLinkStatus,
    PracticeRole,
    PracticeSubscriptionStatus,
} from '../enums';

const IsoDateTime = z.preprocess((value: unknown) => {
    if (value instanceof Date) return value.toISOString();
    return value;
}, z.iso.datetime());

/** ISO 3166-1 alpha-2 country code. */
const CountryCode = z.string().length(2);

/** Street address values (stored on platform_address). */
export const Address = z.object({
    id: Id,
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).nullable(),
    postalCode: z.string().min(1).max(32),
    city: z.string().min(1).max(120),
    country: CountryCode,
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
});

/** Input shape for creating / replacing a street address. */
export const AddressInput = z.object({
    line1: z.string().min(1).max(200),
    line2: z.string().max(200).nullable().optional(),
    postalCode: z.string().min(1).max(32),
    city: z.string().min(1).max(120),
    country: CountryCode,
});

/** Company / coach org — own tenancy, not a household. */
export const Practice = z.object({
    id: Id,
    legalName: z.string().min(1).max(160),
    displayName: z.string().min(1).max(120),
    slug: z.string().min(1).max(80),
    billingEmail: z.email(),
    registrationNumber: z.string().max(64).nullable(),
    vatNumber: z.string().max(64).nullable(),
    phone: z.string().max(40).nullable(),
    website: z.string().max(240).nullable(),
    acceptedTermsAt: IsoDateTime,
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
});

/** Practice with billing address hydrated for settings / signup confirm. */
export const PracticeDetail = Practice.extend({
    billingAddress: Address.nullable(),
});

/** Staff seat on a Practice (billable when isSeatBillable). */
export const PracticeMember = z.object({
    id: Id,
    practiceId: Id,
    accountId: Id,
    /** Greeting / display name from auth.user. */
    name: z.string().min(1).max(120),
    /** Login email from auth.user. */
    email: z.email(),
    role: z.enum(PracticeRole),
    /** Counts toward Practice staff seat meter. */
    isSeatBillable: z.boolean(),
    joinedAt: IsoDateTime,
});

/**
 * Hinge row: Practice ↔ client Household (dual-consent middle contract).
 * Access + control live here — not by burning household VIEWER seats.
 * Display fields (name / owner / count) are derived from auth.household + auth.member.
 * Practice offer = `createdAt`; household accept = `householdAcceptedAt`.
 */
export const PracticeClientLink = z.object({
    id: Id,
    practiceId: Id,
    householdId: HouseholdId,
    /** auth.household.name — roster label. */
    householdName: z.string().min(1).max(120),
    /** Owner display name from auth.user (nullable if missing). */
    ownerName: z.string().max(120).nullable(),
    /** Active household members (auth.member count). */
    memberCount: z.number().int().nonnegative(),
    status: z.enum(PracticeClientLinkStatus),
    access: z.enum(PracticeClientAccess),
    controlFlags: z.array(z.enum(PracticeClientControlFlag)).default([]),
    addedByAccountId: Id.nullable(),
    /** When household OWNER/ADMIN accepted; null while INVITED. */
    householdAcceptedAt: IsoDateTime.nullable(),
    activatedAt: IsoDateTime.nullable(),
    revokedAt: IsoDateTime.nullable(),
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
});

/**
 * Household-facing view of a Practice link (pending invites + active contracts).
 * Practice name is hydrated for accept / decline UI.
 */
export const HouseholdPracticeLink = z.object({
    id: Id,
    practiceId: Id,
    /** Practice.displayName for the invite card. */
    practiceName: z.string().min(1).max(120),
    householdId: HouseholdId,
    status: z.enum(PracticeClientLinkStatus),
    access: z.enum(PracticeClientAccess),
    householdAcceptedAt: IsoDateTime.nullable(),
    activatedAt: IsoDateTime.nullable(),
    revokedAt: IsoDateTime.nullable(),
    createdAt: IsoDateTime,
    updatedAt: IsoDateTime,
});

/**
 * Thin portal metrics for Practice client detail — composed server-side from
 * an ACTIVE PracticeClientLink (no client header query-scope hack).
 */
export const PracticeClientPortalSnapshot = z.object({
    linkId: Id,
    practiceId: Id,
    householdId: HouseholdId,
    currency: z.string().min(3).max(3),
    period: z.string().min(7).max(7),
    /** Money spent this period (minor units). */
    moneySpentTotal: z.number().int(),
    /** Growth income monthly (minor units). */
    growthIncomeMonthly: z.number().int(),
    /** Energy TRAIN sessions this ISO week. */
    energyTrainSessionsThisWeek: z.number().int(),
    /** Soul stillness streak days; null when never logged. */
    soulStillnessStreakDays: z.number().int().nullable(),
});

/** Practice Stripe / meter snapshot. */
export const PracticeBillingStatus = z.object({
    practiceId: Id,
    stripeCustomerId: z.string().nullable(),
    stripeSubscriptionId: z.string().nullable(),
    /** Stripe-backed lifecycle (NONE when never subscribed / cleared). */
    status: z.enum(PracticeSubscriptionStatus),
    /** True when status is ACTIVE or TRIALING. */
    hasActiveSubscription: z.boolean(),
    /** When the Practice org was created. */
    practiceStartedAt: IsoDateTime,
    /** Billable staff members (seat_billable). */
    billableSeatCount: z.number().int().nonnegative(),
    /** Active managed client household links (meter). */
    billableClientCount: z.number().int().nonnegative(),
    /** Catalog prices (eurocents / month). */
    baseAmountCents: z.number().int().nonnegative(),
    staffUnitAmountCents: z.number().int().nonnegative(),
    clientUnitAmountCents: z.number().int().nonnegative(),
    currency: z.literal('eur'),
    /** Current Stripe period start (null if no subscription). */
    periodStartedAt: IsoDateTime.nullable(),
    /** Next renewal / period end (null if no subscription). */
    periodEndsAt: IsoDateTime.nullable(),
});

export const PracticeCreateInput = z.object({
    legalName: z.string().min(1).max(160),
    displayName: z.string().min(1).max(120).optional(),
    slug: z.string().min(1).max(80).optional(),
    billingEmail: z.email(),
    registrationNumber: z.string().max(64).nullable().optional(),
    vatNumber: z.string().max(64).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().max(240).nullable().optional(),
    /** Client sets to now when terms are accepted. */
    acceptedTermsAt: IsoDateTime,
    billingAddress: AddressInput,
});

export const PracticeUpdateInput = z.object({
    practiceId: Id,
    legalName: z.string().min(1).max(160).optional(),
    displayName: z.string().min(1).max(120).optional(),
    billingEmail: z.email().optional(),
    registrationNumber: z.string().max(64).nullable().optional(),
    vatNumber: z.string().max(64).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    website: z.string().max(240).nullable().optional(),
    billingAddress: AddressInput.optional(),
});

export const PracticeAddClientInput = z.object({
    practiceId: Id,
    /** Existing household to link (skips email lookup). */
    householdId: HouseholdId.optional(),
    email: z.email().optional(),
    /**
     * Both VIEW and MANAGE start INVITED. ACTIVE + MANAGE sponsorship only after
     * household OWNER/ADMIN accept (`household.practiceLinks.accept`).
     */
    access: z.enum(PracticeClientAccess).default(PracticeClientAccess.VIEW),
});

/**
 * addClient outcome:
 * - `link_pending` — household exists; dual-consent INVITED link + email to accept
 * - `email_invite` — no user / no household; email token for signup or finish setup
 *
 * `reason` explains email_invite (for coach-facing copy):
 * - `no_user` — “No user found with that email”
 * - `no_household` — “Household not found”
 */
export const PracticeAddClientResult = z.object({
    outcome: z.enum(['link_pending', 'email_invite']),
    reason: z.enum(['no_user', 'no_household']).nullable(),
    email: z.email().nullable(),
    access: z.enum(PracticeClientAccess),
    link: PracticeClientLink.nullable(),
    expiresAt: IsoDateTime.nullable(),
});

/** Redeem an email invite token after the client has a household. */
export const PracticeRedeemClientInviteInput = z.object({
    token: z.string().min(8).max(80),
    householdId: HouseholdId,
});

export const HouseholdPracticeLinkInput = z.object({
    householdId: HouseholdId,
    linkId: Id,
});

export const PracticeInviteMemberInput = z.object({
    practiceId: Id,
    email: z.email(),
    role: z.enum(PracticeRole).default(PracticeRole.COACH),
    isSeatBillable: z.boolean().default(true),
});

export { PracticeAddressKind };

// Inferred types
export type Address = z.infer<typeof Address>;
export type AddressInput = z.infer<typeof AddressInput>;
export type Practice = z.infer<typeof Practice>;
export type PracticeDetail = z.infer<typeof PracticeDetail>;
export type PracticeMember = z.infer<typeof PracticeMember>;
export type PracticeClientLink = z.infer<typeof PracticeClientLink>;
export type HouseholdPracticeLink = z.infer<typeof HouseholdPracticeLink>;
export type PracticeClientPortalSnapshot = z.infer<typeof PracticeClientPortalSnapshot>;
export type PracticeBillingStatus = z.infer<typeof PracticeBillingStatus>;
export type PracticeCreateInput = z.infer<typeof PracticeCreateInput>;
export type PracticeUpdateInput = z.infer<typeof PracticeUpdateInput>;
export type PracticeAddClientInput = z.infer<typeof PracticeAddClientInput>;
export type PracticeAddClientResult = z.infer<typeof PracticeAddClientResult>;
export type PracticeRedeemClientInviteInput = z.infer<typeof PracticeRedeemClientInviteInput>;
export type HouseholdPracticeLinkInput = z.infer<typeof HouseholdPracticeLinkInput>;
export type PracticeInviteMemberInput = z.infer<typeof PracticeInviteMemberInput>;
