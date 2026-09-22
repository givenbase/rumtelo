'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type { CatalogItemBase } from '@rumtelo/contracts';
import { VendorMark } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

import { useTranslations } from '@rumtelo/i18n';

import { partyMark } from '@/app/_lib/vendor-brands';

import { FormInput } from './form-input';

/** Catalog picker row — shared identity fields + optional UI extras. */
export type NamePresetOption = Pick<CatalogItemBase, 'key' | 'name'> & {
    sortOrder?: number;
    group?: string;
    icon?: string | null;
    /** One line under the group, or under the name when the group is shared. */
    description?: string | null;
    /** Extra search needles (merchant aliases, bank descriptors). */
    aliases?: readonly string[];
    /** Favicon hostname — rendered as VendorMark when set (merchant / org pickers). */
    logoDomain?: string | null;
    website?: string | null;
};

type PresetNameFieldProps = {
    value: string;
    onChange: (name: string) => void;
    onSelect?: (preset: NamePresetOption) => void;
    /**
     * Fired when the locked preset is cleared (×) or the name is wiped.
     * Use to reset dependent fields (category, vendor, jar hints).
     * Not fired when picking Other (empty name while typing a custom one).
     */
    onClear?: () => void;
    options: NamePresetOption[];
    placeholder?: string;
    /** Placeholder after picking Other / a free-text key. */
    freeTextPlaceholder?: string;
    disabled?: boolean;
    id?: string;
    /**
     * Lock the name after picking a preset (chip). Manual typing only after
     * a key in `freeTextKeys` (e.g. Other).
     */
    lockPresets?: boolean;
    freeTextKeys?: readonly string[];
    /** Edit hydrate: lock this preset key on mount (not while free-typing). */
    initialLockedKey?: string | null;
};

const EMPTY_FREE_TEXT_KEYS: readonly string[] = [];

function matchesQuery(option: NamePresetOption, query: string) {
    if (!query) return true;
    const needle = query.toLowerCase();
    const key = option.key.toLowerCase();
    const keyAsWords = key.replace(/_/g, ' ').replace(/^merchant:/, '');
    if (option.name.toLowerCase().includes(needle)) return true;
    if (key.includes(needle) || keyAsWords.includes(needle)) return true;
    if (option.group?.toLowerCase().includes(needle)) return true;
    if (option.description?.toLowerCase().includes(needle)) return true;
    return option.aliases?.some(alias => alias.toLowerCase().includes(needle)) ?? false;
}

function findOptionByQuery(options: NamePresetOption[], query: string) {
    if (!query) return null;
    const needle = query.toLowerCase();
    return (
        options.find(option => option.key.toLowerCase() === needle) ??
        options.find(option => option.name.toLowerCase() === needle) ??
        options.find(option => option.aliases?.some(alias => alias.toLowerCase() === needle)) ??
        null
    );
}

function resolveLockedPreset(
    lockPresets: boolean,
    initialLockedKey: string | null | undefined,
    freeTextKeys: readonly string[],
    options: NamePresetOption[]
): NamePresetOption | null {
    if (!lockPresets || !initialLockedKey || freeTextKeys.includes(initialLockedKey)) {
        return null;
    }
    return options.find(option => option.key === initialLockedKey) ?? null;
}

/**
 * Name input with a suggestion dropdown (design: New debt modal).
 * Default: free typing; list filters as you type; picking fills the name.
 * With lockPresets: catalog picks lock; only freeTextKeys (Other) unlock typing.
 */
export function PresetNameField({
    value,
    onChange,
    onSelect,
    onClear,
    options,
    placeholder,
    freeTextPlaceholder,
    disabled,
    id,
    lockPresets = false,
    freeTextKeys = EMPTY_FREE_TEXT_KEYS,
    initialLockedKey = null,
}: PresetNameFieldProps) {
    const tForm = useTranslations('ui.form');
    const resolvedPlaceholder = placeholder ?? tForm('name_example');
    const resolvedFreeTextPlaceholder = freeTextPlaceholder ?? tForm('type_custom_name');
    const [open, setOpen] = useState(false);
    const [locked, setLocked] = useState<NamePresetOption | null>(() =>
        resolveLockedPreset(lockPresets, initialLockedKey, freeTextKeys, options)
    );
    const [hydratedLockKey, setHydratedLockKey] = useState(initialLockedKey);
    const [awaitingCustom, setAwaitingCustom] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listboxId = `${id ?? 'preset-name'}-listbox`;

    const freeKeySet = useMemo(() => new Set(freeTextKeys), [freeTextKeys]);
    const searchOnly = lockPresets && !awaitingCustom && !locked;

    // Sync lock when edit hydrate key arrives (adjust during render — no effect).
    if (initialLockedKey !== hydratedLockKey) {
        setHydratedLockKey(initialLockedKey);
        setLocked(resolveLockedPreset(lockPresets, initialLockedKey, freeTextKeys, options));
    }

    const query = (searchOnly ? filterQuery : value).trim();

    const selectedKey = useMemo(() => {
        if (locked) return locked.key;
        return findOptionByQuery(options, query)?.key ?? null;
    }, [options, query, locked]);

    const filtered = useMemo(() => {
        if (lockPresets && locked) return options;
        const matched = options.filter(option => matchesQuery(option, query));
        // Merchant catalog is large — only surface brands once the user types.
        if (!query) {
            return matched.filter(option => !option.key.startsWith('merchant:'));
        }
        return matched;
    }, [options, query, lockPresets, locked]);

    const grouped = useMemo(() => {
        const map = new Map<string, NamePresetOption[]>();
        for (const opt of filtered) {
            const group = opt.group ?? '';
            const list = map.get(group) ?? [];
            list.push(opt);
            map.set(group, list);
        }
        return [...map.entries()];
    }, [filtered]);

    useEffect(() => {
        function onDoc(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    function clearLock() {
        setLocked(null);
        setAwaitingCustom(false);
        setFilterQuery('');
        onChange('');
        onClear?.();
        setOpen(true);
        requestAnimationFrame(() => inputRef.current?.focus());
    }

    function pickOption(opt: NamePresetOption) {
        onSelect?.(opt);
        setFilterQuery('');
        if (lockPresets && freeKeySet.has(opt.key)) {
            setLocked(null);
            setAwaitingCustom(true);
            onChange('');
            setOpen(false);
            requestAnimationFrame(() => inputRef.current?.focus());
            return;
        }
        if (lockPresets) {
            setLocked(opt);
            setAwaitingCustom(false);
            onChange(opt.name);
            setOpen(false);
            return;
        }
        onChange(opt.name);
        setOpen(false);
    }

    const showLockedChip = Boolean(lockPresets && locked);
    const inputValue = searchOnly ? filterQuery : value;
    const inputPlaceholder = awaitingCustom ? resolvedFreeTextPlaceholder : resolvedPlaceholder;
    const emptyHint = lockPresets ? tForm('no_matches_other') : tForm('no_matches_keep_typing');

    return (
        <div ref={rootRef} className="relative">
            {showLockedChip && locked ? (
                <div
                    className={cn(
                        'flex h-11 w-full items-center gap-2 rounded-lg border border-accent bg-raised px-3',
                        disabled && 'opacity-50'
                    )}>
                    {locked.icon ? (
                        <span className="shrink-0 text-base" aria-hidden>
                            {locked.icon}
                        </span>
                    ) : locked.logoDomain || locked.website ? (
                        <OptionVendorMark option={locked} />
                    ) : null}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                        {value.trim() || locked.name}
                    </span>
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label={tForm('aria.clear_selection')}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-fg-muted hover:bg-fg/5 hover:text-fg disabled:opacity-40"
                        onClick={clearLock}>
                        <span aria-hidden>×</span>
                    </button>
                    <button
                        type="button"
                        disabled={disabled || options.length === 0}
                        aria-label={tForm('aria.show_suggestions')}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40"
                        onClick={() => setOpen(previous => !previous)}>
                        <span className="text-xs tracking-widest" aria-hidden>
                            ···
                        </span>
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <FormInput
                        ref={inputRef}
                        id={id}
                        name="rumtelo-preset-label"
                        value={inputValue}
                        disabled={disabled}
                        placeholder={inputPlaceholder}
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        onChange={event => {
                            const next = event.target.value;
                            if (searchOnly) {
                                setFilterQuery(next);
                                if (value) {
                                    onChange('');
                                    onClear?.();
                                }
                            } else {
                                const wasFilled = Boolean(value.trim());
                                onChange(next);
                                setLocked(null);
                                if (!next.trim()) {
                                    setAwaitingCustom(false);
                                    if (wasFilled) onClear?.();
                                }
                            }
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                    />
                    <button
                        type="button"
                        disabled={disabled || options.length === 0}
                        aria-label={tForm('aria.show_suggestions')}
                        className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40"
                        onClick={() => setOpen(previous => !previous)}>
                        <span className="text-xs tracking-widest" aria-hidden>
                            ···
                        </span>
                    </button>
                </div>
            )}
            {open && options.length > 0 ? (
                <div
                    id={listboxId}
                    role="listbox"
                    className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl bg-fg py-1.5 text-sm text-bg shadow-lg">
                    {filtered.length === 0 ? (
                        <p className="px-3 py-2 text-bg/60">{emptyHint}</p>
                    ) : (
                        grouped.map(([group, items]) => (
                            <div key={group || 'all'}>
                                {group ? (
                                    <div className="px-3 pt-2.5 pb-1">
                                        <div className="text-[10px] font-semibold tracking-wider text-bg/50 uppercase">
                                            {group}
                                        </div>
                                        {items[0]?.description ? (
                                            <p className="mt-0.5 text-xs leading-snug font-normal tracking-normal text-bg/60 normal-case">
                                                {items[0].description}
                                            </p>
                                        ) : null}
                                    </div>
                                ) : null}
                                <ul>
                                    {items.map(opt => {
                                        const selected = opt.key === selectedKey;
                                        const isFree = freeKeySet.has(opt.key);
                                        return (
                                            <li key={opt.key}>
                                                <button
                                                    type="button"
                                                    role="option"
                                                    aria-selected={selected}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg/10"
                                                    onClick={() => pickOption(opt)}>
                                                    <span
                                                        className={`w-4 shrink-0 text-center ${selected ? 'opacity-100' : 'opacity-0'}`}
                                                        aria-hidden>
                                                        ✓
                                                    </span>
                                                    {opt.icon ? (
                                                        <span
                                                            className="w-5 shrink-0 text-center"
                                                            aria-hidden>
                                                            {opt.icon}
                                                        </span>
                                                    ) : opt.logoDomain || opt.website ? (
                                                        <OptionVendorMark option={opt} />
                                                    ) : null}
                                                    <span className="min-w-0 flex-1">
                                                        {opt.name}
                                                    </span>
                                                    {lockPresets && isFree ? (
                                                        <span className="shrink-0 text-[10px] tracking-wide text-bg/45 uppercase">
                                                            Custom
                                                        </span>
                                                    ) : null}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))
                    )}
                </div>
            ) : null}
        </div>
    );
}

function OptionVendorMark({ option }: { option: NamePresetOption }) {
    const mark = partyMark(
        {
            key: option.key,
            name: option.name,
            logoDomain: option.logoDomain,
            website: option.website,
        },
        { fallbackIcon: option.icon ?? null, tone: null }
    );
    return (
        <VendorMark
            name={mark.name}
            src={mark.src}
            fallbackIcon={mark.fallbackIcon}
            tone={mark.tone}
            size={20}
        />
    );
}
