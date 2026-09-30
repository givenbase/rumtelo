'use client';

import {
    counterpartyLockFromOptionKey,
    counterpartyLockToOptionKey,
    type CounterpartyLock,
} from './party-name-options';
import { PresetNameField, type NamePresetOption } from './preset-name-field';
import { SavePartyToggle } from './save-party-toggle';

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
    disabled,
    id,
}: PartyFieldProps) {
    const lock = lockFromValue(value);
    const showSave =
        lock.kind === 'free' &&
        Boolean(value.counterparty.trim()) &&
        !value.merchantKey &&
        !value.partyId;

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
                <SavePartyToggle
                    name={value.counterparty}
                    checked={value.saveParty}
                    disabled={disabled}
                    onCheckedChange={next => onChange({ ...value, saveParty: next })}
                />
            ) : null}
            {/* Visually associated label lives on the FormLabel outside; keep for a11y when standalone. */}
            <span className="sr-only">{label}</span>
        </div>
    );
}
