'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { VendorMark } from '@rumtelo/ui';

import { vendorMarkSrc } from '@/app/_lib/vendor-brands';

import { FormInput } from './form-input';

export type ExpenseMerchantOption = {
    key: string;
    name: string;
    jarKey: string;
    categoryTemplateKey: string;
    aliases?: string[];
};

export type ExpenseCategoryOption = {
    key: string;
    name: string;
    jarKey: string;
    icon?: string | null;
};

export type ExpenseIntentSelection = {
    /** Free-typed or picked vendor → counterparty */
    vendor: string;
    categoryKey: string | null;
    categoryName: string | null;
    jarKey: string | null;
    /** How the intent was chosen — drives follow-up UI */
    source: 'merchant' | 'category' | 'custom' | null;
};

type ExpenseIntentFieldProps = {
    value: ExpenseIntentSelection;
    onChange: (next: ExpenseIntentSelection) => void;
    merchants: ExpenseMerchantOption[];
    categories: ExpenseCategoryOption[];
    categoryIconByKey: Map<string, string | null>;
    disabled?: boolean;
    id?: string;
};

function matchesMerchant(merchant: ExpenseMerchantOption, needle: string) {
    if (!needle) return true;
    if (merchant.name.toLowerCase().includes(needle)) return true;
    return (merchant.aliases ?? []).some(alias => alias.toLowerCase().includes(needle));
}

function matchesCategory(category: ExpenseCategoryOption, needle: string) {
    if (!needle) return true;
    return category.name.toLowerCase().includes(needle);
}

/**
 * Unified payee / type search: merchant hits and category hits in one list.
 * Category pick → vendor chips for that type. Merchant pick fills both.
 */
export function ExpenseIntentField({
    value,
    onChange,
    merchants,
    categories,
    categoryIconByKey,
    disabled,
    id,
}: ExpenseIntentFieldProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [customVendor, setCustomVendor] = useState(false);
    const [skippedVendor, setSkippedVendor] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const listboxId = `${id ?? 'expense-intent'}-listbox`;

    const needle = query.trim().toLowerCase();

    const merchantHits = useMemo(
        () => merchants.filter(merchant => matchesMerchant(merchant, needle)).slice(0, 8),
        [merchants, needle]
    );

    const categoryHits = useMemo(
        () => categories.filter(category => matchesCategory(category, needle)).slice(0, 8),
        [categories, needle]
    );

    const vendorsForCategory = useMemo(() => {
        if (!value.categoryKey) return [];
        return merchants.filter(merchant => merchant.categoryTemplateKey === value.categoryKey);
    }, [merchants, value.categoryKey]);

    const hasSelection = Boolean(value.vendor || value.categoryKey);
    const showVendorPrompt = value.source === 'category' && !value.vendor && !skippedVendor;

    useEffect(() => {
        function onDoc(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    function selectMerchant(merchant: ExpenseMerchantOption) {
        const category = categories.find(
            candidate => candidate.key === merchant.categoryTemplateKey
        );
        onChange({
            vendor: merchant.name,
            categoryKey: merchant.categoryTemplateKey,
            categoryName: category?.name ?? merchant.categoryTemplateKey,
            jarKey: merchant.jarKey,
            source: 'merchant',
        });
        setQuery('');
        setOpen(false);
        setCustomVendor(false);
        setSkippedVendor(false);
    }

    function selectCategory(category: ExpenseCategoryOption) {
        onChange({
            vendor: '',
            categoryKey: category.key,
            categoryName: category.name,
            jarKey: category.jarKey,
            source: 'category',
        });
        setQuery('');
        setOpen(false);
        setCustomVendor(false);
        setSkippedVendor(false);
    }

    function clearSelection() {
        onChange({
            vendor: '',
            categoryKey: null,
            categoryName: null,
            jarKey: null,
            source: null,
        });
        setCustomVendor(false);
        setSkippedVendor(false);
        setQuery('');
        setOpen(true);
    }

    function commitCustomVendor(name: string) {
        const typed = name.trim();
        if (!typed) return;
        onChange({
            vendor: typed,
            categoryKey: value.categoryKey,
            categoryName: value.categoryName,
            jarKey: value.jarKey,
            source: value.categoryKey ? 'category' : 'custom',
        });
        setQuery('');
        setOpen(false);
        setCustomVendor(false);
        setSkippedVendor(false);
    }

    const categoryIcon = value.categoryKey
        ? (categoryIconByKey.get(value.categoryKey) ?? null)
        : null;

    const selectedVendorMark = value.vendor ? vendorMarkSrc({ name: value.vendor }) : null;

    return (
        <div ref={rootRef} className="grid gap-3">
            {hasSelection ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg">
                        {value.vendor ? (
                            <>
                                <VendorMark
                                    name={selectedVendorMark?.name ?? value.vendor}
                                    src={selectedVendorMark?.src ?? null}
                                    size={22}
                                />
                                <span className="min-w-0">
                                    <span className="font-medium">{value.vendor}</span>
                                    {value.categoryName ? (
                                        <span className="text-fg-muted">
                                            {' '}
                                            · {value.categoryName}
                                        </span>
                                    ) : null}
                                </span>
                            </>
                        ) : (
                            <span className="font-medium">
                                {categoryIcon ? `${categoryIcon} ` : ''}
                                {value.categoryName ?? 'Selected'}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={disabled}
                        className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                        onClick={clearSelection}>
                        Change
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <FormInput
                        id={id}
                        name="rumtelo-expense-vendor"
                        value={query}
                        disabled={disabled}
                        placeholder="Vendor or type — e.g. AH, groceries"
                        role="combobox"
                        aria-expanded={open}
                        aria-controls={listboxId}
                        aria-autocomplete="list"
                        onChange={event => {
                            setQuery(event.target.value);
                            setOpen(true);
                        }}
                        onFocus={() => setOpen(true)}
                        onKeyDown={event => {
                            if (event.key === 'Enter') {
                                event.preventDefault();
                                const firstMerchant = merchantHits[0];
                                const firstCategory = categoryHits[0];
                                if (firstMerchant) selectMerchant(firstMerchant);
                                else if (firstCategory) selectCategory(firstCategory);
                                else commitCustomVendor(query);
                            }
                        }}
                    />
                    <button
                        type="button"
                        disabled={disabled}
                        aria-label="Show suggestions"
                        className="absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-accent/15 text-accent hover:bg-accent/25 disabled:opacity-40"
                        onClick={() => setOpen(previous => !previous)}>
                        <span className="text-xs tracking-widest" aria-hidden>
                            ···
                        </span>
                    </button>
                    {open ? (
                        <div
                            id={listboxId}
                            role="listbox"
                            className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-fg py-1.5 text-sm text-bg shadow-lg">
                            {merchantHits.length === 0 && categoryHits.length === 0 ? (
                                <div className="grid gap-1 px-3 py-2">
                                    <p className="text-bg/60">
                                        No matches — press Enter to use “{query.trim() || '…'}” as
                                        vendor.
                                    </p>
                                    {query.trim() ? (
                                        <button
                                            type="button"
                                            className="rounded-md px-2 py-1.5 text-left hover:bg-bg/10"
                                            onClick={() => commitCustomVendor(query)}>
                                            Use “{query.trim()}” as vendor
                                        </button>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    {merchantHits.length > 0 ? (
                                        <div>
                                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-bg/50 uppercase">
                                                Vendors
                                            </div>
                                            <ul>
                                                {merchantHits.map(merchant => {
                                                    const mark = vendorMarkSrc({
                                                        key: merchant.key,
                                                        name: merchant.name,
                                                    });
                                                    const categoryName =
                                                        categories.find(
                                                            candidate =>
                                                                candidate.key ===
                                                                merchant.categoryTemplateKey
                                                        )?.name ?? merchant.categoryTemplateKey;
                                                    return (
                                                        <li key={`m-${merchant.key}`}>
                                                            <button
                                                                type="button"
                                                                role="option"
                                                                aria-selected={false}
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg/10"
                                                                onClick={() =>
                                                                    selectMerchant(merchant)
                                                                }>
                                                                <VendorMark
                                                                    name={mark.name}
                                                                    src={mark.src}
                                                                    size={20}
                                                                    className="bg-bg/15 ring-bg/20"
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    {merchant.name}
                                                                    <span className="text-bg/50">
                                                                        {' '}
                                                                        · {categoryName}
                                                                    </span>
                                                                </span>
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    ) : null}
                                    {categoryHits.length > 0 ? (
                                        <div>
                                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-bg/50 uppercase">
                                                Types
                                            </div>
                                            <ul>
                                                {categoryHits.map(category => (
                                                    <li key={`c-${category.key}`}>
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={false}
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg/10"
                                                            onClick={() =>
                                                                selectCategory(category)
                                                            }>
                                                            {category.icon ? (
                                                                <span
                                                                    className="w-5 shrink-0 text-center"
                                                                    aria-hidden>
                                                                    {category.icon}
                                                                </span>
                                                            ) : null}
                                                            <span>{category.name}</span>
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : null}
                                    {query.trim() ? (
                                        <button
                                            type="button"
                                            className="mt-1 w-full border-t border-bg/10 px-3 py-2 text-left text-bg/70 hover:bg-bg/10"
                                            onClick={() => commitCustomVendor(query)}>
                                            Use “{query.trim()}” as vendor
                                        </button>
                                    ) : null}
                                </>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {showVendorPrompt ? (
                <div className="grid gap-2">
                    <p className="font-mono text-[10px] tracking-wider text-fg-muted uppercase">
                        Know the vendor?
                    </p>
                    {vendorsForCategory.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                            {vendorsForCategory.map(merchant => {
                                const mark = vendorMarkSrc({
                                    key: merchant.key,
                                    name: merchant.name,
                                });
                                return (
                                    <button
                                        key={merchant.key}
                                        type="button"
                                        disabled={disabled}
                                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent"
                                        onClick={() => selectMerchant(merchant)}>
                                        <VendorMark name={mark.name} src={mark.src} size={20} />
                                        {merchant.name}
                                    </button>
                                );
                            })}
                            <button
                                type="button"
                                disabled={disabled}
                                className="inline-flex items-center rounded-xl border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                onClick={() => setCustomVendor(true)}>
                                Other…
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                className="rounded-xl px-3 py-1.5 text-sm text-fg-faint hover:text-fg-muted"
                                onClick={() => setSkippedVendor(true)}>
                                Skip
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                disabled={disabled}
                                className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                onClick={() => setCustomVendor(true)}>
                                Add vendor…
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                className="rounded-full px-3 py-1.5 text-sm text-fg-faint hover:text-fg-muted"
                                onClick={() => setSkippedVendor(true)}>
                                Skip
                            </button>
                        </div>
                    )}
                    {customVendor ? (
                        <FormInput
                            placeholder="Type vendor name"
                            disabled={disabled}
                            value={query}
                            onChange={event => setQuery(event.target.value)}
                            onKeyDown={event => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    commitCustomVendor(query);
                                }
                            }}
                        />
                    ) : null}
                </div>
            ) : null}

            {value.source === 'custom' && value.vendor && !value.categoryKey ? (
                <p className="text-sm text-fg-muted">
                    Pick a jar below — or change and choose a type so we can categorize it.
                </p>
            ) : null}
        </div>
    );
}
