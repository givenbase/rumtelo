/**
 * Goal Schemas
 * Savings goals (SAVE) and income targets (EARN).
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';
import { GoalKind, GoalStatus } from '../enums';

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
    /** When an EARN goal crossed the target (null while open / for SAVE). */
    fulfilledOn: IsoDate.nullable(),
});

export const GoalProjection = z.object({
    goalId: Id,
    /** Month the goal lands at the current contribution rate; null if never / EARN. */
    projectedDate: IsoDate.nullable(),
    monthsRemaining: z.int().nullable(),
    onTrack: z.boolean(),
    shortfallPerMonth: Money,
});

// Inferred types (same-module merge for consumers)
export type Goal = z.infer<typeof Goal>;
export type GoalProjection = z.infer<typeof GoalProjection>;
