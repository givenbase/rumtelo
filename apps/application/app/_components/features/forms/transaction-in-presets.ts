import type { CatalogItemBase } from '@rumtelo/contracts';
import { JarKey } from '@rumtelo/contracts';

/**
 * One-off Transaction In suggestions — money outside fixed/recurring income.
 * Keep each option a distinct source; free-type covers edge cases.
 */
export type TransactionInPreset = Pick<CatalogItemBase, 'key' | 'name'> & {
    group: string;
    icon?: string;
    /** Soft jar hint when the user picks this preset. */
    jarKey?: JarKey;
};

export const TRANSACTION_IN_PRESETS: readonly TransactionInPreset[] = [
    // People
    {
        key: 'GIFT',
        name: 'Gift',
        group: 'People',
        icon: '🎁',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INHERITANCE',
        name: 'Inheritance',
        group: 'People',
        icon: '🕊️',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'REPAID',
        name: 'Someone repaid me',
        group: 'People',
        icon: '🤝',
        jarKey: JarKey.PLAY,
    },

    // Back from spend / deposits
    {
        key: 'REFUND',
        name: 'Refund',
        group: 'Back to you',
        icon: '↩️',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'CASHBACK',
        name: 'Cashback',
        group: 'Back to you',
        icon: '💳',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'DEPOSIT_RETURN',
        name: 'Deposit returned',
        group: 'Back to you',
        icon: '🔑',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'INSURANCE_PAYOUT',
        name: 'Insurance payout',
        group: 'Back to you',
        icon: '🛡️',
        jarKey: JarKey.NECESSITIES,
    },

    // Official / one-off work
    {
        key: 'TAX_RETURN',
        name: 'Tax return',
        group: 'Official',
        icon: '🧾',
        jarKey: JarKey.LONG_TERM_SAVINGS,
    },
    {
        key: 'BENEFIT_EXTRA',
        name: 'Benefit / toeslag',
        group: 'Official',
        icon: '💶',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'REIMBURSEMENT',
        name: 'Reimbursement',
        group: 'Official',
        icon: '💼',
        jarKey: JarKey.NECESSITIES,
    },
    {
        key: 'BONUS',
        name: 'Bonus',
        group: 'Official',
        icon: '🎉',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },

    // Sold or cashed out
    {
        key: 'SOLD',
        name: 'Sold something',
        group: 'Sold',
        icon: '🏷️',
        jarKey: JarKey.PLAY,
    },
    {
        key: 'INVESTMENT_CASH_OUT',
        name: 'Investment cash-out',
        group: 'Sold',
        icon: '📈',
        jarKey: JarKey.FINANCIAL_FREEDOM,
    },

    // Catch-all
    {
        key: 'OTHER_IN',
        name: 'Other',
        group: 'Other',
        icon: '✨',
    },
] as const;

/** Match a typed label to a preset key; null when free-typed / unknown. */
export function resolveInflowKey(label: string): string | null {
    const needle = label.trim().toLowerCase();
    if (!needle) return null;
    return TRANSACTION_IN_PRESETS.find(preset => preset.name.toLowerCase() === needle)?.key ?? null;
}
