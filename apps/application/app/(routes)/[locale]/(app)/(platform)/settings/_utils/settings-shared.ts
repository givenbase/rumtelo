'use client';

import { Currency } from '@rumtelo/contracts';
import { JAR_CHROME } from '@/app/_lib/jar-meta';

export const JAR_COLOR: Record<string, string> = Object.fromEntries(
    Object.entries(JAR_CHROME).map(([key, chrome]) => [key, chrome.color])
);

export function accountKindLabel(kind: string, t: (key: string) => string): string {
    const key = {
        CHECKING: 'pages.settings.panels.bank.checking',
        SAVINGS: 'pages.settings.panels.bank.savings',
        CREDIT: 'pages.settings.panels.bank.credit',
        CASH: 'pages.settings.panels.bank.cash',
        INVESTMENT: 'pages.settings.panels.bank.investment',
    }[kind];
    return key ? t(key) : kind;
}

/** True when the field is empty or still only a bank stub / previous stub. */
export function isIbanStub(value: string): boolean {
    const compact = value.replace(/\s+/g, '').toUpperCase();
    if (!compact) return true;
    return /^NL\d{0,2}[A-Z]{0,4}\d{0,10}$/.test(compact) && compact.length <= 8;
}

export function formatNlIbanStub(bankCode: string): string {
    return `NL00 ${bankCode} 0000 0000 00`;
}

export function nlIbanPrefix(bankCode: string): string {
    return `NL00 ${bankCode} `;
}

export const CURRENCY_OPTIONS = [
    { code: Currency.EUR, persist: true as const },
    { code: Currency.USD, persist: true as const },
    { code: Currency.GBP, persist: true as const },
    { code: 'CHF', persist: false as const },
];

export const AUTO_RULE_KEYS = ['split', 'guard', 'sweep'] as const;
export const AUTO_RULE_DEFAULTS: Record<(typeof AUTO_RULE_KEYS)[number], boolean> = {
    split: true,
    guard: true,
    sweep: true,
};

export function initials(name: string, email: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
    return (email.slice(0, 2) || '?').toUpperCase();
}
