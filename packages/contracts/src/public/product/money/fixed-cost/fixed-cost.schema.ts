/**
 * Fixed-Cost Schemas
 * Recurring fixed costs (bills and credits).
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';
import { Cadence, FlowDirection } from '../../../../common/common.enums';

export const FixedCost = z.object({
    id: Id,
    householdId: HouseholdId,
    jarId: Id,
    categoryId: Id.nullable(),
    name: z.string().min(1).max(120),
    /**
     * Who the money goes to — landlord, insurer, or the organisation you give to.
     * Optional; surfaced mainly for Give so a household can see *whom* it supports.
     */
    counterparty: z.string().max(160).nullable().default(null),
    amount: Money,
    cadence: z.enum(Cadence),
    dueDay: z.int().min(1).max(31).nullable(),
    /** Direction: money out (a bill) or money in (a recurring credit). */
    direction: z.enum(FlowDirection),
    isActive: z.boolean().default(true),
    endsOn: IsoDate.nullable(),
    note: z.string().max(500).nullable(),
});

export const FixedCostsByJar = z.object({
    jarId: Id,
    jarKey: z.string(),
    jarName: z.string(),
    total: Money,
    items: z.array(FixedCost),
});

// Inferred types (same-module merge for consumers)
export type FixedCost = z.infer<typeof FixedCost>;
export type FixedCostsByJar = z.infer<typeof FixedCostsByJar>;
