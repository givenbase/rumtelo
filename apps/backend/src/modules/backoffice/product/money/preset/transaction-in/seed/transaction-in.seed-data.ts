import { JarKey } from '@rumtelo/contracts';

type Seed = {
    key: string;
    name: string;
    groupName: string;
    icon: string;
    jarKey: JarKey | null;
};

/** One-off Transaction In suggestions — money outside fixed/recurring income. */
export const TRANSACTION_IN_PRESET_SEED: readonly Seed[] = [
    {
        key: 'GIFT',
        name: 'Gift',
        groupName: 'People',
        icon: '🎁',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INHERITANCE',
        name: 'Inheritance',
        groupName: 'People',
        icon: '🕊️',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'REPAID',
        name: 'Someone repaid me',
        groupName: 'People',
        icon: '🤝',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'REFUND',
        name: 'Refund',
        groupName: 'Back to you',
        icon: '↩️',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'CASHBACK',
        name: 'Cashback',
        groupName: 'Back to you',
        icon: '💳',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'DEPOSIT_RETURN',
        name: 'Deposit returned',
        groupName: 'Back to you',
        icon: '🔑',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'INSURANCE_PAYOUT',
        name: 'Insurance payout',
        groupName: 'Back to you',
        icon: '🛡️',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'TAX_RETURN',
        name: 'Tax return',
        groupName: 'Official',
        icon: '🧾',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'BENEFIT_EXTRA',
        name: 'Benefit / toeslag',
        groupName: 'Official',
        icon: '💶',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'REIMBURSEMENT',
        name: 'Reimbursement',
        groupName: 'Official',
        icon: '💼',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'BONUS',
        name: 'Bonus',
        groupName: 'Official',
        icon: '🎉',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },
    {
        key: 'SOLD',
        name: 'Sold something',
        groupName: 'Sold',
        icon: '🏷️',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INVESTMENT_CASH_OUT',
        name: 'Investment cash-out',
        groupName: 'Sold',
        icon: '📈',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },
    {
        key: 'OTHER_IN',
        name: 'Other',
        groupName: 'Other',
        icon: '✨',
        jarKey: null,
    },
];
