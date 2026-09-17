import { JarKey } from '@rumtelo/contracts';

type Seed = {
    key: string;
    name: string;
    groupLabel: string;
    icon: string;
    jarKey: JarKey | null;
};

/** One-off Transaction In suggestions — money outside fixed/recurring income. */
export const TRANSACTION_IN_PRESET_SEED: readonly Seed[] = [
    {
        key: 'GIFT',
        name: 'Gift',
        groupLabel: 'People',
        icon: '🎁',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INHERITANCE',
        name: 'Inheritance',
        groupLabel: 'People',
        icon: '🕊️',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'REPAID',
        name: 'Someone repaid me',
        groupLabel: 'People',
        icon: '🤝',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'REFUND',
        name: 'Refund',
        groupLabel: 'Back to you',
        icon: '↩️',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'CASHBACK',
        name: 'Cashback',
        groupLabel: 'Back to you',
        icon: '💳',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'DEPOSIT_RETURN',
        name: 'Deposit returned',
        groupLabel: 'Back to you',
        icon: '🔑',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'INSURANCE_PAYOUT',
        name: 'Insurance payout',
        groupLabel: 'Back to you',
        icon: '🛡️',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'TAX_RETURN',
        name: 'Tax return',
        groupLabel: 'Official',
        icon: '🧾',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'BENEFIT_EXTRA',
        name: 'Benefit / toeslag',
        groupLabel: 'Official',
        icon: '💶',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'REIMBURSEMENT',
        name: 'Reimbursement',
        groupLabel: 'Official',
        icon: '💼',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'BONUS',
        name: 'Bonus',
        groupLabel: 'Official',
        icon: '🎉',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },
    {
        key: 'SOLD',
        name: 'Sold something',
        groupLabel: 'Sold',
        icon: '🏷️',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INVESTMENT_CASH_OUT',
        name: 'Investment cash-out',
        groupLabel: 'Sold',
        icon: '📈',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },
    {
        key: 'OTHER_IN',
        name: 'Other',
        groupLabel: 'Other',
        icon: '✨',
        jarKey: null,
    },
];
