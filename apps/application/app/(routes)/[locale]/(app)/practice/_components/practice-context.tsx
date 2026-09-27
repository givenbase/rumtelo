'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { Practice } from '@rumtelo/contracts';

interface PracticeCtx {
    /** Loaded practice list (may be empty). */
    practices: Practice[];
    /** First / active practice — null if none. */
    activePractice: Practice | null;
    isLoading: boolean;
}

const PracticeContext = createContext<PracticeCtx | null>(null);

export function PracticeContextProvider({
    practices,
    isLoading,
    children,
}: {
    practices: Practice[];
    isLoading: boolean;
    children: ReactNode;
}) {
    const activePractice = practices[0] ?? null;
    return (
        <PracticeContext.Provider value={{ practices, activePractice, isLoading }}>
            {children}
        </PracticeContext.Provider>
    );
}

export function usePractice(): PracticeCtx {
    const ctx = useContext(PracticeContext);
    if (!ctx) throw new Error('usePractice must be inside PracticeContextProvider');
    return ctx;
}
