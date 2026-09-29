/**
 * Income Schemas
 * Income sources with dated amounts (salary history, etc.).
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Cadence } from '../../../../common/common.enums';
import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';
import { IncomeKind } from '../enums';

/** Dated amount for an income source — history of raises / cuts. */
export const IncomeAmountPeriod = z.object({
    id: Id,
    amount: Money,
    effectiveOn: IsoDate,
});

export const IncomeSource = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(120),
    /** Employer, client, or platform (DEGIRO, ACME BV). Optional. */
    counterparty: z.string().max(160).nullable().default(null),
    kind: z.enum(IncomeKind),
    /** Cached current amount (latest period) — used by jar monthly net. */
    amount: Money,
    cadence: z.enum(Cadence),
    /** Day of month the money lands; drives the auto-split trigger. */
    expectedDay: z.int().min(1).max(31).nullable(),
    isActive: z.boolean().default(true),
    startedOn: IsoDate.nullable(),
    /** Last day this source applies; null = open-ended. */
    endsOn: IsoDate.nullable(),
    /** Newest first. */
    periods: z.array(IncomeAmountPeriod).default([]),
});

// Inferred types (same-module merge for consumers)
export type IncomeAmountPeriod = z.infer<typeof IncomeAmountPeriod>;
export type IncomeSource = z.infer<typeof IncomeSource>;
