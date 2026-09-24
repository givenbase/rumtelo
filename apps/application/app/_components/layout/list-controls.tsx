'use client';

import type { ReactNode } from 'react';

import { Typography } from '@rumtelo/ui';
import { cn } from '@rumtelo/utils';

export type ListControlOption<T extends string = string> = {
    key: T;
    label: string;
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

const SHELL =
    'h-7 rounded-full border border-line bg-raised outline-none transition-colors focus:border-accent';

const SORT_SELECT = cn(SHELL, 'px-3 font-mono text-[10px] tracking-wide text-fg uppercase');

const SEARCH_INPUT = cn(
    SHELL,
    'min-w-0 flex-1 rounded-lg px-3 text-sm tracking-normal text-fg normal-case placeholder:text-fg-muted sm:max-w-sm'
);

const CHIP =
    'inline-flex h-7 items-center rounded-full border px-3 font-mono text-[10px] font-medium leading-none tracking-widest uppercase transition-all duration-200';

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
                        filters.value === option.key
                            ? 'border-accent/40 bg-accent-soft text-accent'
                            : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent'
                    )}>
                    {option.label}
                </button>
            ))}
        </div>
    );
}

function SortControl<T extends string>({ sort }: { sort: ListControlsSort<T> }) {
    return (
        <label className="flex h-7 items-center gap-2.5 text-xs text-fg-muted">
            <span className="font-mono text-[10px] leading-none tracking-widest uppercase">
                {sort.label}
            </span>
            <select
                value={sort.value}
                onChange={event => sort.onChange(event.target.value as T)}
                aria-label={sort.ariaLabel}
                className={SORT_SELECT}>
                {sort.options.map(option => (
                    <option key={option.key} value={option.key}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/**
 * Shared list chrome under ListToolbar.
 *
 * - Debts-style (filters + sort, no search): chips and sort share one baseline.
 * - Search pages: search + sort/end on one row; filter chips on the next.
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
    const hasToolsRow = hasSearch || hasEnd || (hasSort && !inlineFiltersWithSort);

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

            {hasToolsRow ? (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                    {search ? (
                        <input
                            type="search"
                            value={search.value}
                            onChange={event => search.onChange(event.target.value)}
                            placeholder={search.placeholder}
                            aria-label={search.ariaLabel ?? search.placeholder}
                            className={SEARCH_INPUT}
                        />
                    ) : (
                        <div className="min-w-0 flex-1" />
                    )}
                    <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2.5">
                        {sort && !inlineFiltersWithSort ? <SortControl sort={sort} /> : null}
                        {end}
                    </div>
                </div>
            ) : null}

            {hasFilters && filters && !inlineFiltersWithSort ? (
                <FilterChips filters={filters} />
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
            className={cn(
                CHIP,
                active
                    ? 'border-accent/40 bg-accent-soft text-accent'
                    : 'border-line text-fg-muted hover:border-accent-hover hover:text-accent',
                className
            )}>
            {children}
        </button>
    );
}
