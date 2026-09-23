import type { Bank } from '@rumtelo/contracts';

import { vendorMarkSrc, type PartyMark } from '@/app/_lib/vendor-brands';

/**
 * Drop a leading catalog bank name from an account label.
 * `"ING · High-yield savings"` → `"High-yield savings"`; `"ABN AMRO"` → `""`.
 */
export function stripBankPrefixFromLabel(
    label: string,
    banks: readonly Pick<Bank, 'name'>[]
): string {
    const trimmed = label.trim();
    if (!trimmed) return '';
    const ranked = [...banks].sort((left, right) => right.name.length - left.name.length);
    for (const bank of ranked) {
        const bankName = bank.name.trim();
        if (!bankName) continue;
        if (trimmed.toLowerCase() === bankName.toLowerCase()) return '';
        for (const sep of [' · ', ' - ', ' ·', ' -'] as const) {
            const prefix = `${bankName}${sep}`;
            if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) {
                return trimmed.slice(prefix.length).trim();
            }
        }
    }
    return trimmed;
}

/** Compose `Bank · nickname` (or just `Bank` when there is no nickname). */
export function composeAccountBankName(
    bankName: string,
    label: string,
    banks: readonly Pick<Bank, 'name'>[]
): string {
    const nickname = stripBankPrefixFromLabel(label, banks);
    return nickname ? `${bankName} · ${nickname}` : bankName;
}

/** Resolve catalog bank from the stored FK (always set on accounts). */
export function resolveAccountBank(
    account: { bankId: string },
    banks: readonly Bank[]
): Bank | null {
    const id = account.bankId.trim();
    if (!id) return null;
    return banks.find(bank => bank.id === id) ?? null;
}

export function accountBankMark(
    account: { bankId: string },
    banks: readonly Bank[]
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

/** EUR households → NL bank catalog until an explicit household country exists. */
export function countryFromCurrency(currency: string | null | undefined): string {
    if (currency === 'EUR') return 'NL';
    return 'NL';
}
