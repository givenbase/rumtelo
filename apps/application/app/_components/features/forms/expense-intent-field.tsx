'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import type {
    CategoryTemplate,
    JarKey,
    MerchantHighlight,
    MerchantPreset,
} from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { Typography, VendorMark } from '@rumtelo/ui';

import { catalogMarkChrome } from '@/app/_lib/party-mark-chrome';
import { useJarCatalog } from '@/app/_lib/use-jar-catalog';
import { partyMark } from '@/app/_lib/vendor-brands';

import { CatalogChipPicker } from './catalog-chip-picker';
import { matchesChipQuery } from './chip-search';
import { FormInput } from './form-input';

/** Form selection state for the expense intent picker (not an API DTO). */
export type ExpenseIntentSelection = {
    /** Free-typed or picked vendor → counterparty */
    vendor: string;
    /** MerchantPreset key when picked from catalog — null for free text. */
    merchantKey: string | null;
    categoryKey: string | null;
    categoryName: string | null;
    jarKey: JarKey | null;
    /** How the intent was chosen — drives follow-up UI */
    source: 'merchant' | 'category' | 'custom' | null;
};

type ExpensePickMode = 'list' | 'manual';

type ExpenseIntentFieldProps = {
    value: ExpenseIntentSelection;
    onChange: (next: ExpenseIntentSelection) => void;
    merchants: readonly MerchantPreset[];
    categories: readonly CategoryTemplate[];
    categoryIconByKey: Map<string, string | null>;
    /** When set, only show types/vendors that belong to this jar. */
    jarKey?: JarKey | null;
    disabled?: boolean;
    id?: string;
};

function matchesMerchant(merchant: MerchantPreset, needle: string) {
    return matchesChipQuery(needle, merchant);
}

function matchesCategory(category: CategoryTemplate, needle: string) {
    if (!needle) return true;
    const key = category.key.toLowerCase();
    const keyAsWords = key.replace(/_/g, ' ');
    return (
        category.name.toLowerCase().includes(needle) ||
        key.includes(needle) ||
        keyAsWords.includes(needle)
    );
}

/**
 * Unified payee / type picker with an explicit path:
 * Pick from list (search + optional vendor chips) vs Type a name (free text only).
 */
export function ExpenseIntentField({
    value,
    onChange,
    merchants,
    categories,
    categoryIconByKey,
    jarKey = null,
    disabled,
    id,
}: ExpenseIntentFieldProps) {
    const t = useTranslations('features.money.expense_intent');
    const tForm = useTranslations('ui.form');
    const highlightLabel = (highlight: MerchantHighlight) => {
        if (highlight === 'FEATURED') return t('highlight_featured');
        if (highlight === 'NEW') return t('highlight_new');
        return t('highlight_popular');
    };
    const pickModes: ReadonlyArray<{ id: ExpensePickMode; label: string }> = [
        { id: 'list', label: t('pick_from_list') },
        { id: 'manual', label: t('type_a_name') },
    ];
    const [pickMode, setPickMode] = useState<ExpensePickMode>('list');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [customVendor, setCustomVendor] = useState(false);
    const [skippedVendor, setSkippedVendor] = useState(false);
    const [vendorChipQuery, setVendorChipQuery] = useState('');
    const rootRef = useRef<HTMLDivElement>(null);
    const listboxId = `${id ?? 'expense-intent'}-listbox`;
    const { byKey: jarByKey } = useJarCatalog();

    const intentChrome = (opts?: {
        icon?: string | null;
        billName?: string | null;
        merchantJarKey?: JarKey | null;
    }) =>
        catalogMarkChrome({
            icon: opts?.icon,
            billName: opts?.billName ?? value.categoryName,
            jarKey: opts?.merchantJarKey ?? value.jarKey ?? jarKey,
            jarByKey,
            categoryTemplates: categories,
        });

    const scopedCategories = useMemo(
        () => (jarKey ? categories.filter(category => category.jarKey === jarKey) : categories),
        [categories, jarKey]
    );

    const scopedMerchants = useMemo(
        () => (jarKey ? merchants.filter(merchant => merchant.jarKey === jarKey) : merchants),
        [merchants, jarKey]
    );

    const needle = query.trim().toLowerCase();

    const merchantHits = useMemo(() => {
        const hits = scopedMerchants.filter(merchant => matchesMerchant(merchant, needle));
        return hits
            .slice()
            .sort((left, right) => {
                const leftHi = left.highlight ? 1 : 0;
                const rightHi = right.highlight ? 1 : 0;
                if (rightHi !== leftHi) return rightHi - leftHi;
                return left.sortOrder - right.sortOrder;
            })
            .slice(0, 8);
    }, [scopedMerchants, needle]);

    const categoryHits = useMemo(
        () => scopedCategories.filter(category => matchesCategory(category, needle)).slice(0, 8),
        [scopedCategories, needle]
    );

    const vendorsForCategory = useMemo(() => {
        if (!value.categoryKey) return [];
        // Category already pins the spend type — use the full catalog for that
        // category (not jar-scoped), so chips/typeahead still work if jar keys drift.
        return merchants
            .filter(merchant => merchant.categoryTemplateKey === value.categoryKey)
            .slice()
            .sort((left, right) => {
                const leftHi = left.highlight ? 1 : 0;
                const rightHi = right.highlight ? 1 : 0;
                if (rightHi !== leftHi) return rightHi - leftHi;
                return left.sortOrder - right.sortOrder;
            });
    }, [merchants, value.categoryKey]);

    const vendorTypeaheadHits = useMemo(() => {
        if (!customVendor) return [];
        const pool = value.categoryKey ? vendorsForCategory : scopedMerchants;
        return pool.filter(merchant => matchesMerchant(merchant, needle)).slice(0, 8);
    }, [customVendor, value.categoryKey, vendorsForCategory, scopedMerchants, needle]);

    const hasSelection = Boolean(value.vendor || value.categoryKey);
    const showVendorPrompt =
        pickMode === 'list' && value.source === 'category' && !value.vendor && !skippedVendor;

    useEffect(() => {
        function onDoc(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
        }
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, []);

    function selectPickMode(next: ExpensePickMode) {
        if (next === pickMode) return;
        setPickMode(next);
        setQuery('');
        setOpen(false);
        setCustomVendor(false);
        setSkippedVendor(false);
        onChange({
            vendor: '',
            merchantKey: null,
            categoryKey: null,
            categoryName: null,
            jarKey: null,
            source: null,
        });
    }

    function selectMerchant(merchant: MerchantPreset) {
        const category = scopedCategories.find(
            candidate => candidate.key === merchant.categoryTemplateKey
        );
        onChange({
            vendor: merchant.name,
            merchantKey: merchant.key,
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

    function selectCategory(category: CategoryTemplate) {
        onChange({
            vendor: '',
            merchantKey: null,
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
            merchantKey: null,
            categoryKey: null,
            categoryName: null,
            jarKey: null,
            source: null,
        });
        setCustomVendor(false);
        setSkippedVendor(false);
        setQuery('');
        if (pickMode === 'list') setOpen(true);
    }

    function commitCustomVendor(name: string) {
        const typed = name.trim();
        if (!typed) return;
        onChange({
            vendor: typed,
            merchantKey: null,
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

    const selectedMerchant =
        (value.merchantKey
            ? merchants.find(merchant => merchant.key === value.merchantKey)
            : null) ??
        (value.vendor
            ? merchants.find(merchant => merchant.name.toLowerCase() === value.vendor.toLowerCase())
            : null);

    const selectedVendorMark = value.vendor
        ? partyMark(
              {
                  key: selectedMerchant?.key,
                  name: value.vendor,
                  logoDomain: selectedMerchant?.logoDomain ?? null,
              },
              intentChrome({
                  icon: categoryIcon,
                  billName: value.categoryName,
              })
          )
        : null;

    return (
        <div ref={rootRef} className="grid gap-3">
            {!hasSelection ? (
                <div className="grid gap-2">
                    <div
                        className="flex flex-wrap gap-2"
                        role="group"
                        aria-label={tForm('aria.pick_mode')}>
                        {pickModes.map(option => {
                            const on = pickMode === option.id;
                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    disabled={disabled}
                                    aria-pressed={on}
                                    onClick={() => selectPickMode(option.id)}
                                    className={
                                        on
                                            ? 'rounded-full border border-accent/40 bg-accent-soft px-3 py-1.5 font-mono text-xs text-accent'
                                            : 'rounded-full border border-line bg-raised px-3 py-1.5 font-mono text-xs text-fg-secondary hover:border-accent-hover hover:text-accent'
                                    }>
                                    {option.label}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-xs leading-relaxed text-fg-faint">{t('catalog_hint')}</p>
                </div>
            ) : null}

            {hasSelection ? (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-fg">
                        {value.vendor ? (
                            <>
                                <VendorMark
                                    name={selectedVendorMark?.name ?? value.vendor}
                                    src={selectedVendorMark?.src ?? null}
                                    fallbackIcon={selectedVendorMark?.fallbackIcon}
                                    tone={selectedVendorMark?.tone}
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
                                {value.categoryName ?? tForm('selected')}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        disabled={disabled}
                        className="font-mono text-xs tracking-wide text-accent uppercase hover:underline"
                        onClick={clearSelection}>
                        {tForm('change')}
                    </button>
                </div>
            ) : pickMode === 'manual' ? (
                <FormInput
                    id={id}
                    name="rumtelo-expense-vendor-manual"
                    value={query}
                    disabled={disabled}
                    placeholder={t('vendor_manual_placeholder')}
                    onChange={event => setQuery(event.target.value)}
                    onKeyDown={event => {
                        if (event.key === 'Enter') {
                            event.preventDefault();
                            commitCustomVendor(query);
                        }
                    }}
                    onBlur={() => {
                        if (query.trim()) commitCustomVendor(query);
                    }}
                />
            ) : (
                <div className="relative">
                    <FormInput
                        id={id}
                        name="rumtelo-expense-vendor"
                        value={query}
                        disabled={disabled}
                        placeholder={t('vendor_search_placeholder')}
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
                        aria-label={tForm('aria.show_suggestions')}
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
                                        {jarKey && scopedCategories.length === 0 && !needle
                                            ? t('no_types_custom')
                                            : t('no_matches_enter', {
                                                  name: query.trim() || '…',
                                              })}
                                    </p>
                                    {query.trim() ? (
                                        <button
                                            type="button"
                                            className="rounded-md px-2 py-1.5 text-left hover:bg-bg/10"
                                            onClick={() => commitCustomVendor(query)}>
                                            {t('use_as_vendor', { name: query.trim() })}
                                        </button>
                                    ) : null}
                                </div>
                            ) : (
                                <>
                                    {merchantHits.length > 0 ? (
                                        <div>
                                            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-bg/50 uppercase">
                                                {t('vendors')}
                                            </div>
                                            <ul>
                                                {merchantHits.map(merchant => {
                                                    const category = categories.find(
                                                        candidate =>
                                                            candidate.key ===
                                                            merchant.categoryTemplateKey
                                                    );
                                                    const mark = partyMark(
                                                        {
                                                            key: merchant.key,
                                                            name: merchant.name,
                                                            logoDomain: merchant.logoDomain,
                                                            website: merchant.website,
                                                        },
                                                        intentChrome({
                                                            icon: category?.icon,
                                                            billName: category?.name,
                                                            merchantJarKey: merchant.jarKey,
                                                        })
                                                    );
                                                    const categoryName =
                                                        category?.name ??
                                                        merchant.categoryTemplateKey;
                                                    const badgeLabel = merchant.highlight
                                                        ? highlightLabel(merchant.highlight)
                                                        : null;
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
                                                                    fallbackIcon={mark.fallbackIcon}
                                                                    tone={mark.tone}
                                                                    size={20}
                                                                    className="bg-bg/15 ring-bg/20"
                                                                />
                                                                <span className="min-w-0 flex-1">
                                                                    {merchant.name}
                                                                    <span className="text-bg/50">
                                                                        {' '}
                                                                        · {categoryName}
                                                                    </span>
                                                                    {badgeLabel ? (
                                                                        <span className="ml-1 text-[10px] tracking-wide text-bg/60 uppercase">
                                                                            {badgeLabel}
                                                                        </span>
                                                                    ) : null}
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
                                                {t('types')}
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
                                            {t('use_as_vendor', { name: query.trim() })}
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
                        {t('know_vendor')}
                    </p>
                    {vendorsForCategory.length > 0 ? (
                        <CatalogChipPicker
                            query={vendorChipQuery}
                            onQueryChange={setVendorChipQuery}
                            items={vendorsForCategory}
                            placeholder={tForm('search_vendor')}
                            noMatchesLabel={tForm('no_matches')}
                            disabled={disabled}
                            otherLabel={tForm('other')}
                            onOther={() => setCustomVendor(true)}
                            trailing={
                                <button
                                    type="button"
                                    disabled={disabled}
                                    className="rounded-xl px-3 py-1.5 text-sm text-fg-faint hover:text-fg-muted"
                                    onClick={() => setSkippedVendor(true)}>
                                    {tForm('skip')}
                                </button>
                            }
                            renderChip={merchant => {
                                const category = categories.find(
                                    candidate => candidate.key === merchant.categoryTemplateKey
                                );
                                const mark = partyMark(
                                    {
                                        key: merchant.key,
                                        name: merchant.name,
                                        logoDomain: merchant.logoDomain,
                                        website: merchant.website,
                                    },
                                    intentChrome({
                                        icon: category?.icon ?? categoryIcon,
                                        billName: category?.name ?? value.categoryName,
                                        merchantJarKey: merchant.jarKey,
                                    })
                                );
                                const badgeLabel = merchant.highlight
                                    ? highlightLabel(merchant.highlight)
                                    : null;
                                return (
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        className="inline-flex items-center gap-2 rounded-xl border border-line bg-raised px-2.5 py-1.5 text-sm text-fg hover:border-accent hover:text-accent"
                                        onClick={() => selectMerchant(merchant)}>
                                        <VendorMark
                                            name={mark.name}
                                            src={mark.src}
                                            fallbackIcon={mark.fallbackIcon}
                                            tone={mark.tone}
                                            size={20}
                                        />
                                        {merchant.name}
                                        {badgeLabel ? (
                                            <span className="text-[10px] tracking-wide text-fg-muted uppercase">
                                                {badgeLabel}
                                            </span>
                                        ) : null}
                                    </button>
                                );
                            }}
                        />
                    ) : (
                        <div className="flex flex-wrap gap-1.5">
                            <button
                                type="button"
                                disabled={disabled}
                                className="rounded-full border border-dashed border-line px-3 py-1.5 text-sm text-fg-muted hover:border-accent hover:text-accent"
                                onClick={() => setCustomVendor(true)}>
                                {tForm('add_vendor')}
                            </button>
                            <button
                                type="button"
                                disabled={disabled}
                                className="rounded-full px-3 py-1.5 text-sm text-fg-faint hover:text-fg-muted"
                                onClick={() => setSkippedVendor(true)}>
                                {tForm('skip')}
                            </button>
                        </div>
                    )}
                    {customVendor ? (
                        <div className="relative grid gap-1.5">
                            <FormInput
                                placeholder={t('vendor_type_placeholder')}
                                disabled={disabled}
                                value={query}
                                autoComplete="off"
                                onChange={event => setQuery(event.target.value)}
                                onKeyDown={event => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        const first = vendorTypeaheadHits[0];
                                        if (first && needle) {
                                            selectMerchant(first);
                                            return;
                                        }
                                        commitCustomVendor(query);
                                    }
                                }}
                            />
                            {vendorTypeaheadHits.length > 0 ? (
                                <ul className="max-h-48 overflow-y-auto rounded-xl border border-line bg-raised py-1 shadow-lg">
                                    {vendorTypeaheadHits.map(merchant => {
                                        const category = categories.find(
                                            candidate =>
                                                candidate.key === merchant.categoryTemplateKey
                                        );
                                        const mark = partyMark(
                                            {
                                                key: merchant.key,
                                                name: merchant.name,
                                                logoDomain: merchant.logoDomain,
                                                website: merchant.website,
                                            },
                                            intentChrome({
                                                icon: category?.icon ?? categoryIcon,
                                                billName: category?.name ?? value.categoryName,
                                                merchantJarKey: merchant.jarKey,
                                            })
                                        );
                                        return (
                                            <li key={merchant.key}>
                                                <button
                                                    type="button"
                                                    disabled={disabled}
                                                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-fg hover:bg-accent-soft hover:text-accent"
                                                    onClick={() => selectMerchant(merchant)}>
                                                    <VendorMark
                                                        name={mark.name}
                                                        src={mark.src}
                                                        fallbackIcon={mark.fallbackIcon}
                                                        tone={mark.tone}
                                                        size={20}
                                                    />
                                                    <span className="min-w-0 flex-1 truncate font-medium">
                                                        {merchant.name}
                                                    </span>
                                                </button>
                                            </li>
                                        );
                                    })}
                                    {needle ? (
                                        <li>
                                            <button
                                                type="button"
                                                disabled={disabled}
                                                className="w-full px-3 py-2 text-left text-sm text-fg-muted hover:bg-accent-soft hover:text-accent"
                                                onClick={() => commitCustomVendor(query)}>
                                                {t('use_as_vendor', { name: query.trim() })}
                                            </button>
                                        </li>
                                    ) : null}
                                </ul>
                            ) : needle ? (
                                <button
                                    type="button"
                                    disabled={disabled}
                                    className="rounded-xl border border-dashed border-line px-3 py-2 text-left text-sm text-fg-muted hover:border-accent hover:text-accent"
                                    onClick={() => commitCustomVendor(query)}>
                                    {t('no_match_use', { name: query.trim() })}
                                </button>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {value.source === 'custom' && value.vendor && !value.categoryKey ? (
                <Typography as="p" size="sm" color="muted">
                    {t('custom_jar_hint')}
                </Typography>
            ) : null}
        </div>
    );
}
