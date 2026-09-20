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
 */
export const TIME_COACH_KEY_PREFIX = 'energy.time.';

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
    dismissedAt: z.iso.datetime().nullable(),
    createdAt: z.iso.datetime(),
});

// Inferred types (same-module merge for consumers)
export type CoachMessage = z.infer<typeof CoachMessage>;
