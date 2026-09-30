'use client';

import { useTranslations } from '@rumtelo/i18n';
import { Toggle } from '@rumtelo/ui';

type SavePartyToggleProps = {
    /** Free-typed counterparty name shown in the label. */
    name: string;
    checked: boolean;
    onCheckedChange: (next: boolean) => void;
    disabled?: boolean;
    className?: string;
};

/**
 * "Save for next time?" for free-typed payees / lenders / income sources.
 * Shared by PartyField and chip+Overige flows (fixed cost, debt, expense).
 */
export function SavePartyToggle({
    name,
    checked,
    onCheckedChange,
    disabled,
    className,
}: SavePartyToggleProps) {
    const tParty = useTranslations('features.money.party_field');
    const trimmed = name.trim();
    if (!trimmed) return null;

    return (
        <div className={className ?? 'rounded-xl border border-line bg-raised px-3'}>
            <Toggle
                label={tParty('save_for_next_time', { name: trimmed })}
                hint={tParty('save_for_next_time_hint')}
                checked={checked}
                onCheckedChange={onCheckedChange}
                disabled={disabled}
            />
        </div>
    );
}
