'use client';

import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';
import type { UseQueryOptions } from '@tanstack/react-query';
import type { ReactNode } from 'react';

type EntityForEditResult<TRow, TValues> =
    | { status: 'loading'; node: ReactNode }
    | { status: 'missing'; node: ReactNode }
    | { status: 'ready'; row: TRow; values: TValues };

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
}): EntityForEditResult<TRow, TValues> {
    const t = useTranslations(options.translationNamespace);
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const query = useLiveQuery(options.listOptions, [], live);
    const row = (query.data ?? []).find(item => item.id === options.id);

    if (live && query.isLoading && !row) {
        return {
            status: 'loading',
            node: (
                <Typography as="p" size="sm" color="muted">
                    {t(options.loadingKey ?? 'loading')}
                </Typography>
            ),
        };
    }
    if (!row) {
        return {
            status: 'missing',
            node: <p className="text-sm text-fg-muted">{t(options.notFoundKey ?? 'not_found')}</p>,
        };
    }
    return { status: 'ready', row, values: options.mapRow(row) };
}
