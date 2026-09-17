import { DebtKind } from '@rumtelo/contracts';

/**
 * Debt types for “New debt”.
 * suggestedMerchantKeys = “who do you owe?” chips (MerchantPreset.key, chip order).
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
        suggestedMerchantKeys: [...NL_BANKS],
    },
    {
        key: 'STUDENT',
        name: 'Student loan',
        kind: DebtKind.STUDENT,
        icon: '🎓',
        suggestedMerchantKeys: ['DUO'],
    },
    {
        key: 'MORTGAGE',
        name: 'Mortgage',
        kind: DebtKind.MORTGAGE,
        icon: '🏠',
        suggestedMerchantKeys: [...NL_MORTGAGE_BANKS],
    },
    {
        key: 'LOAN',
        name: 'Personal loan',
        kind: DebtKind.LOAN,
        icon: '📄',
        suggestedMerchantKeys: [...NL_LOAN_BANKS],
    },
    {
        key: 'CAR_LOAN',
        name: 'Car loan / private lease',
        kind: DebtKind.LOAN,
        icon: '🚗',
        suggestedMerchantKeys: [...NL_LOAN_BANKS],
    },
    {
        key: 'PHONE_PLAN',
        name: 'Phone / device plan',
        kind: DebtKind.LOAN,
        icon: '📱',
        suggestedMerchantKeys: [] as string[],
    },
    {
        key: 'BNPL',
        name: 'Buy now, pay later',
        kind: DebtKind.OTHER,
        icon: '🛍️',
        suggestedMerchantKeys: ['KLARNA', 'AFTERPAY'],
    },
    {
        key: 'GOV_PLAN',
        name: 'Government payment plan',
        kind: DebtKind.OTHER,
        icon: '🏛️',
        suggestedMerchantKeys: ['BELASTINGDIENST', 'CJIB'],
    },
    {
        key: 'OVERDRAFT',
        name: 'Overdraft / roodstand',
        kind: DebtKind.OTHER,
        icon: '🏦',
        suggestedMerchantKeys: [...NL_BANKS],
    },
    {
        key: 'FAMILY',
        name: 'Family / friends',
        kind: DebtKind.FAMILY,
        icon: '🤝',
        suggestedMerchantKeys: [] as string[],
    },
    {
        key: 'OTHER',
        name: 'Other',
        kind: DebtKind.OTHER,
        icon: '📦',
        suggestedMerchantKeys: [] as string[],
    },
] as const;
