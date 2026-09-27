'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
import { isLiveData } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';
import { type LearnBook, type LearnBookPreset, type LearnWatchPreset } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { createContext, useContext, useMemo, type ReactNode } from 'react';

type LearnCatalogApi = {
    books: readonly LearnBookPreset[];
    watches: readonly LearnWatchPreset[];
    addedBooks: readonly LearnBook[];
    booksPending: boolean;
};

const LearnCatalogContext = createContext<LearnCatalogApi | null>(null);

const EMPTY_BOOKS: LearnBookPreset[] = [];
const EMPTY_WATCHES: LearnWatchPreset[] = [];
const EMPTY_ADDED: LearnBook[] = [];

/**
 * Shared book/watch catalog queries for Learn shelf + library + add dialog.
 */
export function LearnCatalogProvider({ children }: { children: ReactNode }) {
    const { householdId } = useAuth();
    const live = isLiveData(householdId);
    const hid = householdId ?? '00000000-0000-4000-8000-000000000000';

    const booksQuery = useLiveQuery(
        apiQuery.growth.catalogs.bookPresets.list.queryOptions({
            input: { householdId: hid },
        }),
        EMPTY_BOOKS,
        live
    );
    const watchesQuery = useLiveQuery(
        apiQuery.growth.catalogs.watchPresets.list.queryOptions({
            input: { householdId: hid },
        }),
        EMPTY_WATCHES,
        live
    );
    const addedBooksQuery = useLiveQuery(
        apiQuery.growth.learn.listBooks.queryOptions({
            input: { householdId: hid },
        }),
        EMPTY_ADDED,
        live
    );

    const value = useMemo<LearnCatalogApi>(
        () => ({
            books: booksQuery.data,
            watches: watchesQuery.data,
            addedBooks: addedBooksQuery.data,
            booksPending: booksQuery.isPending || watchesQuery.isPending,
        }),
        [
            booksQuery.data,
            watchesQuery.data,
            addedBooksQuery.data,
            booksQuery.isPending,
            watchesQuery.isPending,
        ]
    );

    return <LearnCatalogContext.Provider value={value}>{children}</LearnCatalogContext.Provider>;
}

export function useLearnCatalog(): LearnCatalogApi {
    const ctx = useContext(LearnCatalogContext);
    if (!ctx) throw new Error('useLearnCatalog must be used inside LearnCatalogProvider');
    return ctx;
}
