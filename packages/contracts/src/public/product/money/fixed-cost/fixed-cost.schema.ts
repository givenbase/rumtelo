/**
 * Fixed-Cost Schemas
 * Recurring fixed costs (bills and credits) + period settlements.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import {
    HouseholdId,
    HouseholdScoped,
    Id,
    IsoDate,
    Money,
    PeriodKey,
} from '../../../../common/common.schema';
import { Cadence, FlowDirection } from '../../../../common/common.enums';
import { FixedCostSettlementSource, FixedCostSettlementStatus } from '../enums';

export const FixedCost = z.object({
    id: Id,
    householdId: HouseholdId,
    jarId: Id,
    categoryId: Id.nullable(),
    /**
     * When set, this recurring bill is the planned payment for that debt
     * (one fixed cost per debt). Does not reduce the debt balance on its own.
     */
    debtId: Id.nullable().default(null),
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

/** One bill’s status for one calendar month (`YYYY-MM`). */
export const FixedCostSettlement = z.object({
    id: Id,
    householdId: HouseholdId,
    fixedCostId: Id,
    period: PeriodKey,
    status: z.enum(FixedCostSettlementStatus),
    source: z.enum(FixedCostSettlementSource),
    /** Instant the period was marked paid; null when skipped. */
    paidAt: z.iso.datetime().nullable(),
    /** Actual amount when paid; null when skipped or unknown. */
    amount: Money.nullable(),
    transactionId: Id.nullable(),
    note: z.string().max(500).nullable(),
});

export const ListFixedCostSettlements = HouseholdScoped.extend({
    fixedCostId: Id.nullish(),
    period: PeriodKey.nullish(),
});

export const MarkFixedCostPaid = z.object({
    householdId: HouseholdId,
    fixedCostId: Id,
    period: PeriodKey,
    paidAt: z.iso.datetime().nullish(),
    amount: Money.nullish(),
    transactionId: Id.nullish(),
    note: z.string().max(500).nullish(),
});

export const SkipFixedCostPeriod = z.object({
    householdId: HouseholdId,
    fixedCostId: Id,
    period: PeriodKey,
    note: z.string().max(500).nullish(),
});

export const UnlinkFixedCostSettlement = z.object({
    householdId: HouseholdId,
    id: Id,
});

// Inferred types (same-module merge for consumers)
export type FixedCost = z.infer<typeof FixedCost>;
export type FixedCostsByJar = z.infer<typeof FixedCostsByJar>;
export type FixedCostSettlement = z.infer<typeof FixedCostSettlement>;
export type ListFixedCostSettlements = z.infer<typeof ListFixedCostSettlements>;
export type MarkFixedCostPaid = z.infer<typeof MarkFixedCostPaid>;
export type SkipFixedCostPeriod = z.infer<typeof SkipFixedCostPeriod>;
export type UnlinkFixedCostSettlement = z.infer<typeof UnlinkFixedCostSettlement>;
