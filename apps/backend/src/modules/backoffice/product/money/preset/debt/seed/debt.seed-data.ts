import { DebtKind } from '@rumtelo/contracts';

/**
 * Debt types for “New debt”.
 * suggestedLenders = “who do you owe?” chips after the type is picked (plain names).
 * Names should stay in sync with apps/application/app/_lib/vendor-brands.ts for logos.
 * Merchants stay expense/inbox-only — no coupling.
 */
const NL_BANKS = ['ING', 'Rabobank', 'ABN AMRO', 'bunq', 'Revolut', 'N26'] as const;
const NL_MORTGAGE_BANKS = ['ING', 'Rabobank', 'ABN AMRO', 'Triodos', 'ASN Bank'] as const;
const NL_LOAN_BANKS = ['ING', 'Rabobank', 'ABN AMRO', 'bunq'] as const;

export const DEBT_PRESET_SEED = [
    {
        key: 'CREDIT_CARD',
        name: 'Credit card',
        kind: DebtKind.CREDIT_CARD,
        icon: '💳',
        suggestedLenders: [...NL_BANKS],
    },
    {
        key: 'STUDENT',
        name: 'Student loan',
        kind: DebtKind.STUDENT,
        icon: '🎓',
        suggestedLenders: ['DUO'],
    },
    {
        key: 'MORTGAGE',
        name: 'Mortgage',
        kind: DebtKind.MORTGAGE,
        icon: '🏠',
        suggestedLenders: [...NL_MORTGAGE_BANKS],
    },
    {
        key: 'LOAN',
        name: 'Personal loan',
        kind: DebtKind.LOAN,
        icon: '📄',
        suggestedLenders: [...NL_LOAN_BANKS],
    },
    {
        key: 'CAR_LOAN',
        name: 'Car loan / private lease',
        kind: DebtKind.LOAN,
        icon: '🚗',
        suggestedLenders: [...NL_LOAN_BANKS],
    },
    {
        key: 'PHONE_PLAN',
        name: 'Phone / device plan',
        kind: DebtKind.LOAN,
        icon: '📱',
        suggestedLenders: [] as string[],
    },
    {
        key: 'BNPL',
        name: 'Buy now, pay later',
        kind: DebtKind.OTHER,
        icon: '🛍️',
        suggestedLenders: ['Klarna', 'Afterpay / Riverty'],
    },
    {
        key: 'GOV_PLAN',
        name: 'Government payment plan',
        kind: DebtKind.OTHER,
        icon: '🏛️',
        suggestedLenders: ['Belastingdienst', 'CJIB'],
    },
    {
        key: 'OVERDRAFT',
        name: 'Overdraft / roodstand',
        kind: DebtKind.OTHER,
        icon: '🏦',
        suggestedLenders: [...NL_BANKS],
    },
    {
        key: 'FAMILY',
        name: 'Family / friends',
        kind: DebtKind.FAMILY,
        icon: '🤝',
        suggestedLenders: [] as string[],
    },
    {
        key: 'OTHER',
        name: 'Other',
        kind: DebtKind.OTHER,
        icon: '📦',
        suggestedLenders: [] as string[],
    },
] as const;
