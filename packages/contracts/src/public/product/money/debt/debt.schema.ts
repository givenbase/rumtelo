/**
 * Debt Schemas
 * Outstanding liabilities with payoff plan and payment schedule.
 * Zod only — no `export type`.
 */

import { z } from 'zod';

import { Cadence } from '../../../../common/common.enums';
import { HouseholdId, Id, IsoDate, Money } from '../../../../common/common.schema';
import { DebtKind, DebtScheduleKind, PayoffStrategy } from '../enums';
import { FixedCost } from '../fixed-cost/fixed-cost.schema';
import { Transaction } from '../transaction/transaction.schema';

/** Planned payment rhythm — ONCE is not a debt schedule. */
export const DebtPaymentCadence = z.enum([
    Cadence.WEEKLY,
    Cadence.MONTHLY,
    Cadence.QUARTERLY,
    Cadence.YEARLY,
]);

export const Debt = z.object({
    id: Id,
    householdId: HouseholdId,
    name: z.string().min(1).max(120),
    kind: z.enum(DebtKind),
    balance: Money,
    originalBalance: Money,
    /** Annual percentage rate, e.g. 12.9 */
    interestRate: z.number().min(0).max(100),
    minimumPayment: Money,
    extraPayment: Money,
    dueDay: z.int().min(1).max(31).nullable(),
    /**
     * When in the period the payment is due:
     * QUARTERLY → month of quarter 1–3; YEARLY → calendar month 1–12; else null.
     */
    dueMonth: z.int().min(1).max(12).nullable().default(null),
    closedOn: IsoDate.nullable(),
    /** When scheduled payments begin (null = not set). */
    startedOn: IsoDate.nullable(),
    scheduleKind: z.enum(DebtScheduleKind),
    /** Planned rhythm for the minimum / linked fixed cost. */
    paymentCadence: DebtPaymentCadence,
    /** TERM only — how many payments at paymentCadence. */
    termPayments: z.int().positive().nullable(),
    /** DEADLINE only — pay off by this date. */
    maturityOn: IsoDate.nullable(),
});

export function refineDebtSchedule(
    value: {
        scheduleKind: DebtScheduleKind;
        termPayments: number | null | undefined;
        maturityOn: string | null | undefined;
    },
    ctx: z.RefinementCtx
) {
    if (value.scheduleKind === DebtScheduleKind.TERM) {
        if (
            value.termPayments === undefined ||
            value.termPayments === null ||
            value.termPayments < 1
        ) {
            ctx.addIssue({
                code: 'custom',
                path: ['termPayments'],
                message: 'Term schedule needs a payment count',
            });
        }
        if (value.maturityOn !== undefined && value.maturityOn !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['maturityOn'],
                message: 'Term schedule cannot set a deadline',
            });
        }
        return;
    }
    if (value.scheduleKind === DebtScheduleKind.DEADLINE) {
        if (value.maturityOn === undefined || value.maturityOn === null) {
            ctx.addIssue({
                code: 'custom',
                path: ['maturityOn'],
                message: 'Deadline schedule needs a maturity date',
            });
        }
        if (value.termPayments !== undefined && value.termPayments !== null) {
            ctx.addIssue({
                code: 'custom',
                path: ['termPayments'],
                message: 'Deadline schedule cannot set a payment count',
            });
        }
        return;
    }
    if (value.termPayments !== undefined && value.termPayments !== null) {
        ctx.addIssue({
            code: 'custom',
            path: ['termPayments'],
            message: 'Open schedule cannot set a payment count',
        });
    }
    if (value.maturityOn !== undefined && value.maturityOn !== null) {
        ctx.addIssue({
            code: 'custom',
            path: ['maturityOn'],
            message: 'Open schedule cannot set a deadline',
        });
    }
}

/** Q/Y debts must pick dueMonth in range. */
export function refineDebtDueMonth(
    value: { paymentCadence?: string; dueMonth?: number | null },
    ctx: z.RefinementCtx
) {
    const cadence = value.paymentCadence;
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

/** Progress + related rows for the debt detail page. */
export const DebtDetail = z.object({
    debt: Debt,
    /** originalBalance − balance (floored at 0). */
    paidAmount: Money,
    remaining: Money,
    paymentsMade: z.int().nonnegative(),
    /** TERM: payments still owed. Null for OPEN / DEADLINE. */
    paymentsRemaining: z.int().nonnegative().nullable(),
    payments: z.array(Transaction),
    linkedFixedCost: FixedCost.nullable(),
});

export const DebtPlan = z.object({
    strategy: z.enum(PayoffStrategy),
    totalBalance: Money,
    totalInterestProjected: Money,
    debtFreeOn: IsoDate.nullable(),
    monthsRemaining: z.int().nullable(),
    order: z.array(z.object({ debtId: Id, name: z.string(), payoffOn: IsoDate.nullable() })),
});

/** Positive payment size — service writes a negative OUT transaction. */
export const RecordDebtPayment = z.object({
    householdId: HouseholdId,
    debtId: Id,
    amount: Money.refine(value => value > 0, { message: 'Payment must be positive' }),
    bookedOn: IsoDate,
    note: z.string().max(500).nullish(),
});

// Inferred types (same-module merge for consumers)
export type Debt = z.infer<typeof Debt>;
export type DebtDetail = z.infer<typeof DebtDetail>;
export type DebtPlan = z.infer<typeof DebtPlan>;
export type RecordDebtPayment = z.infer<typeof RecordDebtPayment>;
export type DebtPaymentCadence = z.infer<typeof DebtPaymentCadence>;
