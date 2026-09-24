import {
    Cadence,
    DebtKind,
    DebtScheduleKind,
    GivingCause,
    GoalKind,
    IncomeKind,
} from '@rumtelo/contracts';
import { z } from 'zod';

import { parseAmountToMinorUnits } from '@/app/_lib/money-input';

/** Scoped `useTranslations('ui.form')`. */
export type FormT = (key: string) => string;

function positiveMoneyInput(msg: FormT) {
    return z
        .string()
        .min(1, msg('validation.amount_required'))
        .refine(
            value => {
                const cents = parseAmountToMinorUnits(value);
                return cents !== null && cents > 0;
            },
            { message: msg('validation.valid_amount') }
        );
}

function nonNegativeMoneyInput(msg: FormT) {
    return z
        .string()
        .min(1, msg('validation.amount_required'))
        .refine(
            value => {
                const cents = parseAmountToMinorUnits(value);
                return cents !== null && cents >= 0;
            },
            { message: msg('validation.valid_amount') }
        );
}

export function createExpenseFormSchema(msg: FormT) {
    return z.object({
        amount: positiveMoneyInput(msg),
        note: z.string().max(280),
        jarId: z.string().min(1, msg('validation.choose_jar')),
        label: z.string().max(120),
    });
}

export type ExpenseFormSchemaValues = z.infer<ReturnType<typeof createExpenseFormSchema>>;

export function createIncomeFormSchema(msg: FormT) {
    return z.object({
        name: z.string().min(1, msg('validation.name_required')).max(120),
        amount: positiveMoneyInput(msg),
        kind: z.enum(IncomeKind),
        cadence: z.enum(Cadence),
        amountEffectiveFrom: z.string().optional(),
    });
}

export type IncomeFormSchemaValues = z.infer<ReturnType<typeof createIncomeFormSchema>>;

export function createFixedCostFormSchema(msg: FormT) {
    return z.object({
        name: z.string().min(1, msg('validation.name_required')).max(120),
        counterparty: z.string().max(160).optional(),
        amount: positiveMoneyInput(msg),
        jarId: z.string().min(1, msg('validation.choose_jar')),
        categoryId: z.string().nullable().optional(),
        dueDay: z.string().optional(),
    });
}

export type FixedCostFormSchemaValues = z.infer<ReturnType<typeof createFixedCostFormSchema>>;

export function createGoalFormSchema(msg: FormT) {
    return z.object({
        kind: z.enum(GoalKind),
        name: z.string().min(1, msg('validation.name_required')).max(120),
        target: positiveMoneyInput(msg),
        monthlyContribution: z.string().optional(),
        jarId: z.string().optional(),
        why: z.string().max(500).optional(),
        cause: z.enum(GivingCause).nullable().optional(),
        givingOrganisationKey: z.string().max(64).nullable().optional(),
    });
}

export type GoalFormSchemaValues = z.infer<ReturnType<typeof createGoalFormSchema>>;

export function createDebtFormSchema(msg: FormT) {
    return z
        .object({
            name: z.string().min(1, msg('validation.who_owe_required')).max(120),
            balance: nonNegativeMoneyInput(msg),
            interestRate: z
                .string()
                .min(1, msg('validation.interest_required'))
                .refine(
                    value => {
                        const parsed = Number(value.replace(',', '.'));
                        return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100;
                    },
                    { message: msg('validation.interest_range') }
                ),
            minimumPayment: z.string().optional(),
            extraPayment: z.string().optional(),
            dueDay: z.string().optional(),
            startedOn: z.string().optional(),
            scheduleKind: z.enum(DebtScheduleKind),
            paymentCadence: z.enum([
                Cadence.WEEKLY,
                Cadence.MONTHLY,
                Cadence.QUARTERLY,
                Cadence.YEARLY,
            ]),
            termPayments: z.string().optional(),
            maturityOn: z.string().optional(),
            linkFixedCost: z.boolean(),
            kind: z.enum(DebtKind),
        })
        .superRefine((value, ctx) => {
            if (value.scheduleKind === DebtScheduleKind.TERM) {
                const count = Number(value.termPayments);
                if (!Number.isFinite(count) || count < 1) {
                    ctx.addIssue({
                        code: 'custom',
                        path: ['termPayments'],
                        message: msg('validation.term_payments'),
                    });
                }
            }
            if (value.scheduleKind === DebtScheduleKind.DEADLINE && !value.maturityOn?.trim()) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['maturityOn'],
                    message: msg('validation.pick_deadline'),
                });
            }
        });
}

export type DebtFormSchemaValues = z.infer<ReturnType<typeof createDebtFormSchema>>;

export function createMoveMoneyFormSchema(msg: FormT) {
    return z
        .object({
            fromJarId: z.string().min(1, msg('validation.choose_from_jar')),
            toJarId: z.string().min(1, msg('validation.choose_to_jar')),
            amount: positiveMoneyInput(msg),
            note: z.string().max(280),
        })
        .refine(values => values.fromJarId !== values.toJarId, {
            message: msg('validation.different_jars'),
            path: ['toJarId'],
        });
}

export type MoveMoneyFormSchemaValues = z.infer<ReturnType<typeof createMoveMoneyFormSchema>>;

export function createAssetFormSchema(msg: FormT) {
    return z
        .object({
            kind: z.string().min(1).max(64),
            name: z.string().min(1, msg('validation.name_required')).max(80),
            value: positiveMoneyInput(msg),
            flow: z.string().optional(),
        })
        .superRefine((values, ctx) => {
            if (!values.flow?.trim()) return;
            const cents = parseAmountToMinorUnits(values.flow);
            if (cents === null || cents < 0) {
                ctx.addIssue({
                    code: 'custom',
                    path: ['flow'],
                    message: msg('validation.valid_amount'),
                });
            }
        });
}

export type AssetFormSchemaValues = z.infer<ReturnType<typeof createAssetFormSchema>>;

export function createStubFormSchema(msg: FormT) {
    return z.object({
        label: z.string().min(1, msg('validation.name_required')).max(80),
        amount: z.string().optional(),
    });
}

export type StubFormSchemaValues = z.infer<ReturnType<typeof createStubFormSchema>>;
