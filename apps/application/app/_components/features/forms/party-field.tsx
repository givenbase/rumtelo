'use client';

import { useId } from 'react';

import { Typography } from '@rumtelo/ui';

import { useTranslations } from '@rumtelo/i18n';

import {
    counterpartyLockFromOptionKey,
    counterpartyLockToOptionKey,
    type CounterpartyLock,
} from './party-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';

export type PartyFieldValue = {
    counterparty: string;
    merchantKey: string;
    partyId: string;
    /** Ask: save free-typed name for next time. Default ON when free-typing. */
    saveParty: boolean;
};

type PartyFieldProps = {
    value: PartyFieldValue;
    onChange: (next: PartyFieldValue) => void;
    options: NamePresetOption[];
    label: string;
    placeholder?: string;
    /** Badge / group already baked into `options`; this is the checkbox copy. */
    saveLabel?: (name: string) => string;
    disabled?: boolean;
    id?: string;
};

function lockFromValue(value: PartyFieldValue): CounterpartyLock {
    if (value.partyId) return { kind: 'party', partyId: value.partyId };
    if (value.merchantKey) return { kind: 'merchant', merchantKey: value.merchantKey };
    return { kind: 'free' };
}

/**
 * Counterparty picker: Rumtelo catalog + household parties + free text.
 * Free text shows an inline “Save for next time?” checkbox (default ON).
 */
export function PartyField({
    value,
    onChange,
    options,
    label,
    placeholder,
    saveLabel,
    disabled,
    id,
}: PartyFieldProps) {
    const tParty = useTranslations('features.money.party_field');
    const checkboxId = useId();
    const lock = lockFromValue(value);
    const showSave =
        lock.kind === 'free' &&
        Boolean(value.counterparty.trim()) &&
        !value.merchantKey &&
        !value.partyId;

    const resolvedSaveLabel =
        saveLabel?.(value.counterparty.trim()) ??
        tParty('save_for_next_time', { name: value.counterparty.trim() });

    return (
        <div className="space-y-2">
            <PresetNameField
                id={id}
                value={value.counterparty}
                disabled={disabled}
                placeholder={placeholder}
                options={options}
                lockPresets
                initialLockedKey={counterpartyLockToOptionKey(lock)}
                onChange={next => {
                    onChange({
                        counterparty: next,
                        merchantKey: '',
                        partyId: '',
                        saveParty: next.trim() ? (value.saveParty ?? true) : true,
                    });
                }}
                onClear={() => {
                    onChange({
                        counterparty: '',
                        merchantKey: '',
                        partyId: '',
                        saveParty: true,
                    });
                }}
                onSelect={opt => {
                    const nextLock = counterpartyLockFromOptionKey(opt.key);
                    if (nextLock.kind === 'party') {
                        onChange({
                            counterparty: opt.name,
                            merchantKey: '',
                            partyId: nextLock.partyId,
                            saveParty: false,
                        });
                        return;
                    }
                    if (nextLock.kind === 'merchant') {
                        onChange({
                            counterparty: opt.name,
                            merchantKey: nextLock.merchantKey,
                            partyId: '',
                            saveParty: false,
                        });
                    }
                }}
            />
            {showSave ? (
                <div className="flex items-start gap-3 rounded-xl border border-line bg-raised px-3 py-3">
                    <input
                        id={checkboxId}
                        type="checkbox"
                        className="mt-1"
                        checked={value.saveParty}
                        disabled={disabled}
                        onChange={event => onChange({ ...value, saveParty: event.target.checked })}
                    />
                    <label htmlFor={checkboxId} className="cursor-pointer">
                        <span className="block text-sm font-medium text-fg">
                            {resolvedSaveLabel}
                        </span>
                        <Typography as="span" variant="caption" className="mt-0.5 block">
                            {tParty('save_for_next_time_hint')}
                        </Typography>
                    </label>
                </div>
            ) : null}
            {/* Visually associated label lives on the FormLabel outside; keep for a11y when standalone. */}
            <span className="sr-only">{label}</span>
        </div>
    );
}
