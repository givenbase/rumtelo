'use client';

import type { ReactNode } from 'react';

import {
    Icon,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    Typography,
} from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

export type ListControlOption<T extends string = string> = {
    key: T;
    label: string;
    /** Optional leading mark (e.g. jar icon + color). */
    leading?: ReactNode;
};

type ListControlsSort<T extends string> = {
    value: T;
    options: ReadonlyArray<ListControlOption<T>>;
    onChange: (value: T) => void;
    label: string;
    ariaLabel: string;
};

type ListControlsFilters<T extends string> = {
    value: T;
    options: ReadonlyArray<ListControlOption<T>>;
    onChange: (value: T) => void;
    ariaLabel: string;
};

type ListControlsSearch = {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel?: string;
};

/** Interactive chrome — line-strong so fields read as controls (WCAG 1.4.11). */
const FOCUS_RING =
    'outline-none transition-colors focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/35';

const CHIP =
    'inline-flex h-8 items-center rounded-full border px-3 font-mono text-[11px] font-medium leading-none tracking-wide uppercase transition-colors duration-200';

const CHIP_IDLE =
    'border-line-strong bg-surface text-fg-secondary hover:border-accent hover:text-accent';
const CHIP_ACTIVE = 'border-accent bg-accent-soft text-accent';

/**
 * Primary list search — surface field, strong border, leading icon.
 * Prefer this over a bare Input when the job is “find in a list”.
 */
export function ListSearchField({
    value,
    onChange,
    placeholder,
    ariaLabel,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    ariaLabel?: string;
    className?: string;
}) {
    return (
        <div className={cn('relative min-w-0', className)}>
            <Icon
                name="search"
                size="sm"
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-fg-muted"
            />
            <input
                type="search"
                value={value}
                onChange={event => onChange(event.target.value)}
                placeholder={placeholder}
                aria-label={ariaLabel ?? placeholder}
                className={cn(
                    'h-11 w-full min-w-0 rounded-xl border border-line-strong bg-surface py-2.5 pr-3.5 pl-10 text-sm text-fg shadow-sm',
                    'placeholder:text-fg-muted',
                    FOCUS_RING
                )}
            />
        </div>
    );
}

function FilterChips<T extends string>({ filters }: { filters: ListControlsFilters<T> }) {
    return (
        <div
            className="flex min-w-0 flex-wrap items-center gap-2"
            role="group"
            aria-label={filters.ariaLabel}>
            {filters.options.map(option => (
                <button
                    key={option.key}
                    type="button"
                    aria-pressed={filters.value === option.key}
                    onClick={() => filters.onChange(option.key)}
                    className={cn(
                        CHIP,
                        'gap-1.5',
                        filters.value === option.key ? CHIP_ACTIVE : CHIP_IDLE
                    )}>
                    {option.leading}
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function SortControl<T extends string>({ sort }: { sort: ListControlsSort<T> }) {
    return (
        <label className="flex h-8 items-center gap-2 text-xs text-fg-muted">
            <span className="font-mono text-[10px] leading-none tracking-widest uppercase">
                {sort.label}
            </span>
            <Select value={sort.value} onValueChange={value => sort.onChange(value as T)}>
                <SelectTrigger
                    size="sm"
                    aria-label={sort.ariaLabel}
                    className={cn(
                        'h-8 min-w-[7rem] rounded-full border-line-strong bg-surface px-3 font-mono text-[11px] tracking-wide text-fg uppercase shadow-none',
                        FOCUS_RING
                    )}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent
                    position="popper"
                    align="end"
                    className="rounded-lg border-line bg-surface text-fg shadow-md">
                    {sort.options.map(option => (
                        <SelectItem
                            key={option.key}
                            value={option.key}
                            className="font-mono text-[11px] tracking-wide uppercase">
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </label>
    );
}

/**
 * Shared list chrome under ListToolbar.
 *
 * Search is the primary control (surface + strong border + icon).
 * Chips / sort / end stay secondary on the next tools row.
 */
export function ListControls<TSort extends string = string, TFilter extends string = string>({
    title,
    sort,
    filters,
    search,
    end,
    hint,
    children,
    className,
}: {
    title?: ReactNode;
    sort?: ListControlsSort<TSort>;
    filters?: ListControlsFilters<TFilter>;
    search?: ListControlsSearch;
    /** Extra controls on the tools row (e.g. layout toggles). */
    end?: ReactNode;
    hint?: ReactNode;
    children?: ReactNode;
    className?: string;
}) {
    const hasTitle = title !== undefined && title !== null;
    const hasFilters = Boolean(filters);
    const hasSearch = Boolean(search);
    const hasSort = Boolean(sort);
    const hasEnd = Boolean(end);
    /** Few chips + sort only — keep them on one row (debts pattern). */
    const inlineFiltersWithSort = hasFilters && hasSort && !hasSearch && !hasEnd;
    const hasSecondaryTools = hasEnd || (hasSort && !inlineFiltersWithSort);

    return (
        <div className={cn('grid gap-3', className)}>
            {hasTitle ? (
                <div className="min-w-0">
                    {typeof title === 'string' ? (
                        <Typography as="span" variant="eyebrow" color="primary">
                            {title}
                        </Typography>
                    ) : (
                        title
                    )}
                </div>
            ) : null}

            {inlineFiltersWithSort && filters && sort ? (
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
                    <FilterChips filters={filters} />
                    <SortControl sort={sort} />
                </div>
            ) : null}

            {hasSearch && search ? (
                <ListSearchField
                    value={search.value}
                    onChange={search.onChange}
                    placeholder={search.placeholder}
                    ariaLabel={search.ariaLabel}
                />
            ) : null}

            {hasFilters && filters && !inlineFiltersWithSort ? (
                <div
                    className={cn(
                        'flex flex-wrap items-center gap-x-3 gap-y-2.5',
                        hasSecondaryTools && 'justify-between'
                    )}>
                    <FilterChips filters={filters} />
                    {hasSecondaryTools ? (
                        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
                            {sort && !inlineFiltersWithSort ? <SortControl sort={sort} /> : null}
                            {end}
                        </div>
                    ) : null}
                </div>
            ) : null}

            {!hasFilters && hasSecondaryTools ? (
                <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2">
                    {sort && !inlineFiltersWithSort ? <SortControl sort={sort} /> : null}
                    {end}
                </div>
            ) : null}

            {hint !== undefined && hint !== null ? (
                <div>
                    {typeof hint === 'string' ? (
                        <Typography as="p" size="xs" color="muted">
                            {hint}
                        </Typography>
                    ) : (
                        hint
                    )}
                </div>
            ) : null}

            {children ? <div className="grid gap-3">{children}</div> : null}
        </div>
    );
}

/** Compact chip used inside {@link ListControls} `end` (same height as filter chips). */
export function ListControlsChip({
    active,
    onClick,
    children,
    className,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    className?: string;
}) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(CHIP, active ? CHIP_ACTIVE : CHIP_IDLE, className)}>
            {children}
        </button>
    );
}
