/**
 * Time Template Schemas (Energy)
 * "How does your week mostly look?" — one shape per day kind, per person.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id } from '../../../../common/common.schema';
import { TimeCategory, TimeDayKind } from '../enums';

/** ISO weekday, 1 = Monday … 7 = Sunday. */
export const IsoWeekday = z.int().min(1).max(7);

/** Minutes per category for one template day. Categories left out count as 0. */
export const TimeMinutesByCategory = z.partialRecord(
    z.enum(TimeCategory),
    z.int().min(0).max(1440)
);

/**
 * A stylised day — the device time-use surveys use when a full diary is too much
 * to ask. Logging a day becomes "was today typical?" instead of thirteen numbers.
 */
export const TimeTemplate = z.object({
    id: Id,
    householdId: HouseholdId,
    /** Rumtelo `auth.account.id` — templates are personal, not household-wide. */
    accountId: Id,
    kind: z.enum(TimeDayKind),
    /** Weekdays this shape applies to. A weekday belongs to exactly one of a person's templates. */
    weekdays: z.array(IsoWeekday),
    minutes: TimeMinutesByCategory,
    /**
     * Median of the person's own logged days on these weekdays over the last 28 days,
     * once there are at least three. Replaces the setup answers as the smart default.
     */
    learned: TimeMinutesByCategory.nullable(),
    learnedDays: z.int(),
});

// Inferred types (same-module merge for consumers)
export type IsoWeekday = z.infer<typeof IsoWeekday>;
export type TimeMinutesByCategory = z.infer<typeof TimeMinutesByCategory>;
export type TimeTemplate = z.infer<typeof TimeTemplate>;
