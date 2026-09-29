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
import { FixedCostSettlementSource, FixedCostSettlementStatus, JarKey } from '../enums';
import { CounterpartyRef } from '../party/party.schema';

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
    /** FixedCostPreset.key when picked from the catalog. Null when free-typed. */
    presetKey: z.string().min(1).max(64).nullable().default(null),
    /** Payee — see `CounterpartyRef` for the three states. */
    ...CounterpartyRef.shape,
    amount: Money,
    cadence: z.enum(Cadence),
    dueDay: z.int().min(1).max(31).nullable(),
    /**
     * When in the period the bill is charged:
     * QUARTERLY → month of quarter 1–3; YEARLY → calendar month 1–12; else null.
     */
    dueMonth: z.int().min(1).max(12).nullable().default(null),
    /** Direction: money out (a bill) or money in (a recurring credit). */
    direction: z.enum(FlowDirection),
    isActive: z.boolean().default(true),
    /** First day this bill applies; null = unknown (treat carefully in as-of maths). */
    startedOn: IsoDate.nullable(),
    endsOn: IsoDate.nullable(),
    note: z.string().max(500).nullable(),
});

/** Q/Y create/update must pick dueMonth in range; W/M clear it. */
export function refineFixedCostDueMonth(
    value: { cadence?: string; dueMonth?: number | null },
    ctx: z.RefinementCtx
) {
    const cadence = value.cadence;
    if (cadence === undefined) return;
    if (cadence !== Cadence.QUARTERLY && cadence !== Cadence.YEARLY) return;
    const max = cadence === Cadence.QUARTERLY ? 3 : 12;
    const month = value.dueMonth;
    if (month === null || month === undefined || month < 1 || month > max) {
        ctx.addIssue({
            code: 'custom',
            path: ['dueMonth'],
            message: 'Pick which month you are charged',
        });
    }
}

export const FixedCostsByJar = z.object({
    jarId: Id,
    jarKey: z.enum(JarKey),
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
