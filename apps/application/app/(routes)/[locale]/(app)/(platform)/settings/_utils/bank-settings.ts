import { AccountKind, type Account, type Bank } from '@rumtelo/contracts';

import type { BankAccountFormValues } from './settings-form-zod';

export const EMPTY_BANK: BankAccountFormValues = {
    label: '',
    iban: '',
    kind: AccountKind.CHECKING,
    bankId: '',
    settlementAccountId: null,
};

export function isMockInstitution(name: string): boolean {
    return /mock/i.test(name);
}

export function sortInstitutions<T extends { name: string }>(list: T[]): T[] {
    return [...list].sort((left, right) => {
        const leftMock = isMockInstitution(left.name) ? 0 : 1;
        const rightMock = isMockInstitution(right.name) ? 0 : 1;
        if (leftMock !== rightMock) return leftMock - rightMock;
        return left.name.localeCompare(right.name);
    });
}

export function matchCatalogToInstitution(institutionName: string, bankList: Bank[]): Bank | null {
    const needle = institutionName.trim().toLowerCase();
    if (!needle) return null;
    return (
        bankList.find(bank => bank.name.toLowerCase() === needle) ??
        bankList.find(
            bank =>
                needle.includes(bank.name.toLowerCase()) || bank.name.toLowerCase().includes(needle)
        ) ??
        null
    );
}

export function accountNameTaken(
    accounts: Account[],
    name: string,
    exceptId?: string | null
): boolean {
    const needle = name.trim().toLowerCase();
    if (!needle) return false;
    return accounts.some(row => row.name.trim().toLowerCase() === needle && row.id !== exceptId);
}
