import { DebtKind } from '@rumtelo/contracts';

/**
 * Debt types for “New debt”.
 * merchantKeys = “who do you owe?” chips (MerchantPreset.key, chip order).
 */
const NL_BANKS = ['ING', 'RABOBANK', 'ABN_AMRO', 'BUNQ', 'REVOLUT', 'N26'] as const;
const NL_MORTGAGE_BANKS = ['ING', 'RABOBANK', 'ABN_AMRO', 'TRIODOS', 'ASN_BANK'] as const;
const NL_LOAN_BANKS = ['ING', 'RABOBANK', 'ABN_AMRO', 'BUNQ'] as const;

export const DEBT_PRESET_SEED = [
    {
        key: 'CREDIT_CARD',
        name: 'Credit card',
        kind: DebtKind.CREDIT_CARD,
        icon: '💳',
        merchantKeys: [...NL_BANKS],
    },
    {
        key: 'STUDENT',
        name: 'Student loan',
        kind: DebtKind.STUDENT,
        icon: '🎓',
        merchantKeys: ['DUO'],
    },
    {
        key: 'MORTGAGE',
        name: 'Mortgage',
        kind: DebtKind.MORTGAGE,
        icon: '🏠',
        merchantKeys: [...NL_MORTGAGE_BANKS],
    },
    {
        key: 'LOAN',
        name: 'Personal loan',
        kind: DebtKind.LOAN,
        icon: '📄',
        merchantKeys: [...NL_LOAN_BANKS],
    },
    {
        key: 'CAR_LOAN',
        name: 'Car loan / private lease',
        kind: DebtKind.LOAN,
        icon: '🚗',
        merchantKeys: [...NL_LOAN_BANKS],
    },
    {
        key: 'PHONE_PLAN',
        name: 'Phone / device plan',
        kind: DebtKind.LOAN,
        icon: '📱',
        merchantKeys: [] as string[],
    },
    {
        key: 'BNPL',
        name: 'Buy now, pay later',
        kind: DebtKind.OTHER,
        icon: '🛍️',
        merchantKeys: ['KLARNA', 'AFTERPAY'],
    },
    {
        key: 'GOV_PLAN',
        name: 'Government payment plan',
        kind: DebtKind.OTHER,
        icon: '🏛️',
        merchantKeys: ['BELASTINGDIENST', 'CJIB'],
    },
    {
        key: 'OVERDRAFT',
        name: 'Overdraft / roodstand',
        kind: DebtKind.OTHER,
        icon: '🏦',
        merchantKeys: [...NL_BANKS],
    },
    {
        key: 'FAMILY',
        name: 'Family / friends',
        kind: DebtKind.FAMILY,
        icon: '🤝',
        merchantKeys: [] as string[],
    },
    {
        key: 'OTHER',
        name: 'Other',
        kind: DebtKind.OTHER,
        icon: '📦',
        merchantKeys: [] as string[],
    },
] as const;
