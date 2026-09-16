/**
 * Jar Schemas
 * T. Harv Eker's six-jar model — allocation, categories, balances.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, Money, PeriodKey } from '../../../../common/common.schema';
import { JarKey } from '../enums';

export const JarCapabilities = z.object({
    /** Day-to-day expenses / inbox sorting may land here. */
    canSpend: z.boolean(),
    /** Goals and buffers may attach here. */
    canSave: z.boolean(),
    /** Money leaves only as invest / holdings transfer (never day-to-day spend). */
    canInvest: z.boolean(),
    /** Included in dashboard "safe to spend" / play-left maths. */
    countsTowardSafeToSpend: z.boolean(),
    /** Recurring bills (fixed OUT) may be booked here. False for Freedom and Long-term savings. */
    allowsFixedCosts: z.boolean(),
});

export const Category = z.object({
    id: Id,
    jarId: Id,
    name: z.string().min(1).max(80),
    /**
     * On JarBalance: manual envelope + monthly-normalised active fixed OUT for this category.
     * On Category CRUD: the stored manual envelope only.
     */
    budgeted: Money,
    /** On JarBalance: sorted OUT transactions in the period for this category. */
    actual: Money,
    isArchived: z.boolean().default(false),
});

export const Jar = z.object({
    id: Id,
    householdId: HouseholdId,
    key: z.enum(JarKey),
    name: z.string().min(1).max(80),
    subtitle: z.string().max(160).nullable(),
    icon: z.string().max(8).nullable(),
    /** Share of net income routed here on arrival. All jars must sum to 100. */
    percentage: z.number().min(0).max(100),
    capabilities: JarCapabilities,
    sortOrder: z.int(),
});

/** A jar as shown on the dashboard for one period, with its money resolved. */
export const JarBalance = Jar.extend({
    period: PeriodKey,
    allocated: Money,
    spent: Money,
    /** Sorted Transaction In for this jar in the period (gifts, top-ups, refunds). */
    credited: Money,
    /** Active fixed OUT for this jar, monthly-normalised. */
    committedOut: Money,
    /** allocated + credited − spent (transactions only; ignores fixed commitments). */
    remaining: Money,
    /** remaining − committedOut — what is left after plan + spend (UI primary). */
    available: Money,
    /** available / (allocated + credited), clamped 0..1; null when envelope is empty. */
    progress: z.number().min(0).max(1).nullable(),
    overspent: z.boolean(),
    categories: z.array(Category),
});

export const UpdateJarSplit = z.object({
    householdId: HouseholdId,
    split: z.array(z.object({ jarId: Id, percentage: z.number().min(0).max(100) })).min(1),
});

// Inferred types (same-module merge for consumers)
export type JarCapabilities = z.infer<typeof JarCapabilities>;
export type Category = z.infer<typeof Category>;
export type Jar = z.infer<typeof Jar>;
export type JarBalance = z.infer<typeof JarBalance>;
export type UpdateJarSplit = z.infer<typeof UpdateJarSplit>;
