'use client';

import type { ReactNode } from 'react';

import { ChipSearch, matchesChipQuery } from './chip-search';

type ChipItem = {
    key: string;
    name: string;
    aliases?: readonly string[];
};

/**
 * Shared search + filtered chip row used by debt/fixed-cost/expense/goal pickers.
 */
export function CatalogChipPicker<T extends ChipItem>({
    query,
    onQueryChange,
    items,
    placeholder,
    noMatchesLabel,
    disabled,
    otherLabel,
    onOther,
    trailing,
    renderChip,
}: {
    query: string;
    onQueryChange: (next: string) => void;
    items: readonly T[];
    placeholder: string;
    noMatchesLabel: string;
    disabled?: boolean;
    /** Optional dashed “other / more” chip. */
    otherLabel?: string;
    onOther?: () => void;
    /** Extra controls after chips (e.g. “more” when not searching). */
    trailing?: ReactNode;
    renderChip: (item: T) => ReactNode;
}) {
    const visible = items.filter(item => matchesChipQuery(query, item));

    return (
        <div className="grid gap-2">
            <ChipSearch
                value={query}
                onChange={onQueryChange}
                placeholder={placeholder}
                disabled={disabled}
            />
            {query.trim() && visible.length === 0 ? (
                <p className="text-sm text-fg-muted">{noMatchesLabel}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
                {visible.map(item => (
                    <span key={item.key}>{renderChip(item)}</span>
                ))}
                {otherLabel && onOther ? (
                    <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                        onClick={onOther}>
                        {otherLabel}
                    </button>
                ) : null}
                {trailing}
            </div>
        </div>
    );
}
