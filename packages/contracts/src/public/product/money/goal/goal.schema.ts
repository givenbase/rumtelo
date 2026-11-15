/**
 * Goal Schemas
 * Savings goals (SAVE), income targets (EARN), and yearly Give pledges (GIVE).
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';
import { GivingCause, GoalKind, GoalStatus, JarKey } from '../enums';

export const Goal = z.object({
    id: Id,
    householdId: HouseholdId,
    kind: z.enum(GoalKind).default(GoalKind.SAVE),
    /**
     * SAVE: funds from a jar (usually LONG_TERM_SAVINGS / FINANCIAL_FREEDOM).
     * EARN: always null — measures household monthly net.
     * GIVE: the Give jar — progress is money that left it.
     */
    jarId: Id.nullable(),
    name: z.string().min(1).max(120),
    icon: z.string().max(8).nullable(),
    /** SAVE: savings target. EARN: monthly net-income target. GIVE: yearly pledge. */
    target: Money,
    /** SAVE: put aside so far. GIVE: given so far in the pledge year (from the ledger). */
    saved: Money,
    monthlyContribution: Money,
    targetOn: IsoDate.nullable(),
    status: z.enum(GoalStatus),
    why: z.string().max(500).nullable(),
    /**
     * GIVE only — cause this pledge is reserved for (`null` = open / any giving).
     * SAVE / EARN always null.
     */
    cause: z.enum(GivingCause).nullable().default(null),
    /**
     * GIVE only — GivingOrganization catalog key when the pledge names an org.
     * Free-text / open pledges leave this null. SAVE / EARN always null.
     */
    givingOrganizationKey: z.string().min(1).max(64).nullable().default(null),
    /** When an EARN goal crossed the target (null while open / for SAVE). */
    fulfilledOn: IsoDate.nullable(),
    /**
     * SAVE: priority within the same jar — lower = higher focus (#1 first).
     * EARN / GIVE: unused (always 0).
     */
    sortOrder: z.int().nonnegative().default(0),
});

export const GoalProjection = z.object({
    goalId: Id,
    /** Month the goal lands at the current contribution rate; null if never / EARN. */
    projectedDate: IsoDate.nullable(),
    monthsRemaining: z.int().nullable(),
    onTrack: z.boolean(),
    shortfallPerMonth: Money,
});

/**
 * A goal in one line for other products (Growth · Koers shows it next to a course
 * item, or on its own while nothing links to it): the goal, its jar and the landing date.
 */
export const GoalSummary = z.object({
    id: Id,
    kind: z.enum(GoalKind),
    name: z.string().min(1).max(120),
    icon: z.string().max(8).nullable(),
    status: z.enum(GoalStatus),
    target: Money,
    /** Same meaning as {@link Goal} `saved`. */
    saved: Money,
    targetOn: IsoDate.nullable(),
    /** Jar the goal draws on; null for EARN goals. */
    jarId: Id.nullable(),
    jarKey: z.enum(JarKey).nullable(),
    jarName: z.string().min(1).max(80).nullable(),
    /** Month the goal lands at the current contribution rate; null if never / EARN. */
    projectedDate: IsoDate.nullable(),
});

// Inferred types (same-module merge for consumers)
export type Goal = z.infer<typeof Goal>;
export type GoalProjection = z.infer<typeof GoalProjection>;
export type GoalSummary = z.infer<typeof GoalSummary>;
