'use client';

import { FormInput } from './form-input';

type ChipQueryItem = {
    key: string;
    name: string;
    aliases?: readonly string[];
};

/** Same needles as the preset name field: name, key, aliases. */
export function matchesChipQuery(query: string, item: ChipQueryItem): boolean {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    if (item.name.toLowerCase().includes(needle)) return true;
    const key = item.key.toLowerCase();
    const keyAsWords = key.replaceAll('_', ' ');
    if (key.includes(needle) || keyAsWords.includes(needle)) return true;
    return item.aliases?.some(alias => alias.toLowerCase().includes(needle)) ?? false;
}

/**
 * Search above a brand or vendor chip row.
 * Same text field as the other name pickers — type to narrow the chips.
 */
export function ChipSearch({
    value,
    onChange,
    placeholder,
    disabled,
}: {
    value: string;
    onChange: (next: string) => void;
    placeholder: string;
    disabled?: boolean;
}) {
    return (
        <FormInput
            type="search"
            value={value}
            disabled={disabled}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            onChange={event => onChange(event.target.value)}
        />
    );
}
