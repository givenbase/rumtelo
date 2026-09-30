'use client';

import type { ReactNode } from 'react';

import { ChipSearch, matchesChipQuery } from './chip-search';

type ChipItem = {
    key: string;
    name: string;
    aliases?: readonly string[];
};

/** Idle chip count before search — keep rows scannable; type to reach the rest. */
export const CATALOG_CHIP_IDLE_LIMIT = 20;

/**
 * Shared search + filtered chip row used by debt/fixed-cost/expense/goal pickers.
 * With `idleLimit`, idle shows the first N items (caller order = priority); typing
 * searches the full `items` list.
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
    idleLimit = null,
    selectedKey,
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
    /**
     * Max chips when the search box is empty. `null` = show every match.
     * Default {@link CATALOG_CHIP_IDLE_LIMIT}.
     */
    idleLimit?: number | null;
    /** Keep this key visible even when past the idle slice. */
    selectedKey?: string | null;
    renderChip: (item: T) => ReactNode;
}) {
    const needle = query.trim();
    const matched = needle ? items.filter(item => matchesChipQuery(query, item)) : items;
    const visible = (() => {
        if (needle || idleLimit === null || matched.length <= idleLimit) return matched;
        const head = matched.slice(0, idleLimit);
        if (!selectedKey || head.some(item => item.key === selectedKey)) return head;
        const selected = matched.find(item => item.key === selectedKey);
        if (!selected) return head;
        return [...head.slice(0, Math.max(0, idleLimit - 1)), selected];
    })();

    return (
        <div className="grid gap-2.5">
            <ChipSearch
                value={query}
                onChange={onQueryChange}
                placeholder={placeholder}
                disabled={disabled}
            />
            {needle && matched.length === 0 ? (
                <p className="font-mono text-xs tracking-wide text-fg-muted">{noMatchesLabel}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-1.5">
                {visible.map(item => (
                    <span key={item.key}>{renderChip(item)}</span>
                ))}
                {otherLabel && onOther ? (
                    <button
                        type="button"
                        disabled={disabled}
                        className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent"
                        onClick={onOther}>
                        {otherLabel}
                    </button>
                ) : null}
                {trailing}
            </div>
        </div>
    );
}
