'use client';

import { isLiveData } from '@/app/_lib/preview';
import { EntityNotFoundState } from '@/components/features/helpers/entity-not-found-state';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { EmptyState, Typography } from '@rumtelo/ui';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type EntityForEditResult<TRow, TValues> =
    | { status: 'loading'; node: ReactNode }
    | { status: 'missing'; node: ReactNode }
    | { status: 'ready'; row: TRow; values: TValues };

function editGate<TRow, TValues>(options: {
    t: (key: string) => string;
    loading: boolean;
    row: TRow | null | undefined;
    mapRow: (row: TRow) => TValues;
    loadingKey?: string;
    notFoundKey?: string;
    /** When set, missing entity renders EmptyState + link to the list. */
    listHref?: string;
    backKey?: string;
}): EntityForEditResult<TRow, TValues> {
    if (options.loading && !options.row) {
        return {
            status: 'loading',
            node: (
                <Typography as="p" size="sm" color="muted">
                    {options.t(options.loadingKey ?? 'loading')}
                </Typography>
            ),
        };
    }
    if (!options.row) {
        const title = options.t(options.notFoundKey ?? 'not_found');
        return {
            status: 'missing',
            node: options.listHref ? (
                <EntityNotFoundState
                    title={title}
                    href={options.listHref}
                    backLabel={options.t(options.backKey ?? 'back')}
                />
            ) : (
                <EmptyState icon="inbox" title={title} />
            ),
        };
    }
    return { status: 'ready', row: options.row, values: options.mapRow(options.row) };
}

/**
 * Shared create/update loader: list query → find by id → map to form defaults.
 */
export function useEntityForEdit<TRow extends { id: string }, TValues>(options: {
    listOptions: UseQueryOptions<TRow[]>;
    id: string;
    mapRow: (row: TRow) => TValues;
    loadingKey?: string;
    notFoundKey?: string;
    translationNamespace: string;
    /** List URL when the slug is missing (EmptyState CTA). */
    listHref?: string;
    backKey?: string;
}): EntityForEditResult<TRow, TValues> {
    const t = useTranslations(options.translationNamespace);
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(options.listOptions, [], live);
    const row = (query.data ?? []).find(item => item.id === options.id);

    return editGate({
        t,
        loading: live && query.isLoading,
        row,
        mapRow: options.mapRow,
        loadingKey: options.loadingKey,
        notFoundKey: options.notFoundKey,
        listHref: options.listHref,
        backKey: options.backKey,
    });
}

/**
 * Shared edit loader for get-by-id queries (e.g. assets).
 */
export function useEntityGetForEdit<TRow, TValues>(options: {
    getOptions: UseQueryOptions<TRow | null>;
    mapRow: (row: TRow) => TValues;
    loadingKey?: string;
    notFoundKey?: string;
    translationNamespace: string;
    listHref?: string;
    backKey?: string;
}): EntityForEditResult<TRow, TValues> {
    const t = useTranslations(options.translationNamespace);
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(options.getOptions, null, live);

    return editGate({
        t,
        loading: live && query.isLoading,
        row: query.data,
        mapRow: options.mapRow,
        loadingKey: options.loadingKey,
        notFoundKey: options.notFoundKey,
        listHref: options.listHref,
        backKey: options.backKey,
    });
}

/**
 * Build ready/loading/missing from an already-resolved row (multi-query screens).
 */
export function resolveEntityForEdit<TRow, TValues>(options: {
    t: (key: string) => string;
    loading: boolean;
    row: TRow | null | undefined;
    mapRow: (row: TRow) => TValues;
    loadingKey?: string;
    notFoundKey?: string;
    listHref?: string;
    backKey?: string;
}): EntityForEditResult<TRow, TValues> {
    return editGate(options);
}
