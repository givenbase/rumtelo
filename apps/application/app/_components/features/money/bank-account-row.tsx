'use client';

import type { ReactNode } from 'react';

import type { Account, Bank } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { VendorMark } from '@rumtelo/ui';
import { cn, formatIban } from '@rumtelo/utils';

import { accountBankMark, resolveAccountBank } from '@/app/_lib/resolve-account-bank';
import type { PartyMark } from '@/app/_lib/vendor-brands';

export type BankAccountRowProps = {
    account: Account;
    banks: readonly Bank[];
    /** Override title (defaults to account.name). */
    title?: string;
    /** Override subtitle (defaults to bank · IBAN · primary). */
    sub?: string;
    /** Override logo (e.g. while editing bank in Settings). */
    mark?: PartyMark | null;
    markSize?: 18 | 22 | 28 | 32;
    selected?: boolean;
    disabled?: boolean;
    className?: string;
    /**
     * Click handler for the identity (mark + labels).
     * With `selected`, styles as a bordered radio pick (import / jar seat).
     * Without `selected` chrome, still clickable (settings open-edit).
     */
    onSelect?: () => void;
    /** Trailing actions (settings edit / sync). */
    trailing?: ReactNode;
};

/**
 * Shared bank seat row — VendorMark + name + bank/IBAN sub.
 * Same chrome in Settings, jar placement, and statement import.
 */
export function BankAccountRow({
    account,
    banks,
    title,
    sub,
    mark: markOverride,
    markSize = 22,
    selected,
    disabled = false,
    className,
    onSelect,
    trailing,
}: BankAccountRowProps) {
    const t = useTranslations('pages.settings.panels.bank');
    const bank = resolveAccountBank(account, banks);
    const mark = markOverride === undefined ? accountBankMark(account, banks) : markOverride;
    const rowTitle = title ?? account.name;
    const rowSub =
        sub ??
        [
            bank?.name,
            account.iban ? formatIban(account.iban) : t('no_iban'),
            account.isPrimary ? t('primary') : null,
        ]
            .filter(Boolean)
            .join(' · ');

    const identityInner = (
        <>
            {mark ? <VendorMark name={mark.name} src={mark.src} size={markSize} /> : null}
            <span className="grid min-w-0 flex-1 gap-px text-left">
                <span className="truncate text-sm text-fg">{rowTitle}</span>
                {rowSub ? (
                    <span className="truncate text-[11px] leading-snug text-pretty text-fg-muted">
                        {rowSub}
                    </span>
                ) : null}
            </span>
        </>
    );

    const isPicker = typeof selected === 'boolean';

    const identity = onSelect ? (
        <button
            type="button"
            role={isPicker ? 'radio' : undefined}
            aria-checked={isPicker ? selected : undefined}
            aria-label={rowTitle}
            disabled={disabled}
            onClick={onSelect}
            className={cn(
                'flex min-w-0 flex-1 items-center gap-2.5 text-left transition-colors',
                isPicker &&
                    cn(
                        'w-full rounded-xl border px-3 py-2.5',
                        selected
                            ? 'border-accent bg-accent-soft/60'
                            : 'border-line bg-raised hover:border-fg-faint'
                    ),
                disabled && 'opacity-50'
            )}>
            {identityInner}
        </button>
    ) : (
        <div className="flex min-w-0 flex-1 items-center gap-2.5">{identityInner}</div>
    );

    if (trailing) {
        return (
            <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
                {identity}
                {trailing}
            </div>
        );
    }

    return <div className={cn(isPicker ? undefined : 'flex min-w-0', className)}>{identity}</div>;
}
