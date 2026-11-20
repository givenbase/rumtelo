/**
 * Coach Schemas
 * Cross-product advisory messages — informatie, nooit schaamte.
 */

import { z } from 'zod';

import { HouseholdId, Id, PeriodKey } from '../../../common/common.schema';
import { CoachKind } from '../enums';

export { CoachKind } from '../enums';

/**
 * The Coach never scolds — the manifesto is "informatie, nooit schaamte".
 * Every message must carry exactly one concrete next move.
 */
/**
 * Rule identity for producers. Dismissals stick per key; a later refresh
 * updates the text or retracts the row when the rule no longer applies.
 * Time-week rules use {@link TIME_COACH_KEY_PREFIX}.
 * Money tips use {@link MONEY_COACH_KEY_PREFIX}.
 */
export const TIME_COACH_KEY_PREFIX = 'energy.time.';
export const MONEY_COACH_KEY_PREFIX = 'money.';
/**
 * Fixed-cost tips (`money.fixed_costs.<rule>:<period or quarter>`). Unlike the other money
 * tips these are household-wide (`accountId` null): hiding one hides it for everyone on the board.
 * Rules: `over_necessities`, `business_leak`, `subscription_review`.
 */
export const FIXED_COSTS_COACH_KEY_PREFIX = 'money.fixed_costs.';
/** Course tips (`growth.course.rhythm_quiet:<rhythmId>`); copy lives in client i18n. */
export const COURSE_COACH_KEY_PREFIX = 'growth.course.';

export const CoachMessage = z.object({
    id: Id,
    householdId: HouseholdId,
    /** Rumtelo `auth.account.id` — null means the whole household may see it. */
    accountId: Id.nullable(),
    /** Stable producer key, e.g. `energy.time.work_ceiling:2026-W39`. */
    key: z.string().max(80).nullable(),
    period: PeriodKey,
    kind: z.enum(CoachKind),
    text: z.string().max(500),
    /** The single action this message asks for; null when purely informational. */
    ctaLabel: z.string().max(60).nullable(),
    ctaHref: z.string().max(200).nullable(),
    /**
     * Optional second move, shown quieter than the first. Only a few rules carry one
     * (fixed costs over the Necessities split: "Add income" + "Open the biggest fixed cost").
     * Null on every other message.
     */
    ctaSecondaryLabel: z.string().max(60).nullable().default(null),
    ctaSecondaryHref: z.string().max(200).nullable().default(null),
    dismissedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
});

// Inferred types (same-module merge for consumers)
export type CoachMessage = z.infer<typeof CoachMessage>;
