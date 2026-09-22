import type { MerchantPreset } from '@rumtelo/contracts';
import { nlIbanBankCode } from '@rumtelo/utils';

import { vendorMarkSrc, type PartyMark } from '@/app/_lib/vendor-brands';

/** Payment rails — not banks for account seats. */
const NON_BANK_RAILS = new Set(['KLARNA', 'AFTERPAY', 'PAYPAL', 'WISE']);

export function bankingBanksOnly(merchants: readonly MerchantPreset[]): MerchantPreset[] {
    return merchants.filter(merchant => !NON_BANK_RAILS.has(merchant.key));
}

/**
 * Match a household account to a banking merchant.
 * Prefer NL IBAN bank code; fall back to the account name containing the bank name.
 */
export function resolveAccountBank(
    account: { name: string; iban: string | null },
    banks: readonly MerchantPreset[]
): MerchantPreset | null {
    const code = account.iban ? nlIbanBankCode(account.iban) : null;
    if (code) {
        const byCode = banks.find(bank => bank.ibanBankCode?.toUpperCase() === code);
        if (byCode) return byCode;
    }

    const needle = account.name.trim().toLowerCase();
    if (!needle) return null;
    return (
        banks.find(bank => {
            const bankName = bank.name.toLowerCase();
            return (
                needle === bankName ||
                needle.startsWith(`${bankName} ·`) ||
                needle.startsWith(`${bankName} -`) ||
                needle.includes(bankName)
            );
        }) ?? null
    );
}

export function accountBankMark(
    account: { name: string; iban: string | null },
    banks: readonly MerchantPreset[]
): PartyMark | null {
    const bank = resolveAccountBank(account, banks);
    if (!bank) return null;
    return vendorMarkSrc({
        key: bank.key,
        name: bank.name,
        logoDomain: bank.logoDomain,
        website: bank.website,
    });
}
