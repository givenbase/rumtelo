'use client';

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from 'react';

import {
    getHelpersServerSnapshot,
    readHelpersEnabled,
    subscribeHelpersEnabled,
    writeHelpersEnabled,
} from '@/app/_lib/feature-helpers';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { usePracticePreview } from '@/components/features/shell/practice-preview';

type FeatureHelpersContextValue = {
    /** Inline helpers visible (why-lines, jar guides, …). */
    helpersEnabled: boolean;
    setHelpersEnabled: (enabled: boolean) => void;
    toggleHelpers: () => void;
};

const FeatureHelpersContext = createContext<FeatureHelpersContextValue | null>(null);

/**
 * Live preference — false while Practice is previewing a client board
 * (helpers are for household members, not coaches).
 * VIEWER look-along: no Coach tips, strips, or “✦ De coach” chrome.
 */
export function useHelpersEnabled(): boolean {
    const preferred = useSyncExternalStore(
        subscribeHelpersEnabled,
        readHelpersEnabled,
        getHelpersServerSnapshot
    );
    const { capabilities } = usePracticePreview();
    const { periodClosed, periodLookingAhead, canSeeCoach } = useBoardWriteAccess();
    // Closed / future months are a finished or projected record — no coach nudges or helper chrome.
    return (
        preferred && capabilities.showHelpers && canSeeCoach && !periodClosed && !periodLookingAhead
    );
}

/**
 * Single source of truth for feature helpers visibility.
 * Help / Settings call setHelpersEnabled; HelperGate reads the same store.
 */
export function FeatureHelpersProvider({ children }: { children: ReactNode }) {
    const helpersEnabled = useHelpersEnabled();

    const setHelpersEnabled = useCallback((enabled: boolean) => {
        writeHelpersEnabled(enabled);
    }, []);

    const toggleHelpers = useCallback(() => {
        writeHelpersEnabled(!readHelpersEnabled());
    }, []);

    const value = useMemo(
        () => ({ helpersEnabled, setHelpersEnabled, toggleHelpers }),
        [helpersEnabled, setHelpersEnabled, toggleHelpers]
    );

    return (
        <FeatureHelpersContext.Provider value={value}>{children}</FeatureHelpersContext.Provider>
    );
}

export function useFeatureHelpers() {
    const ctx = useContext(FeatureHelpersContext);
    const helpersEnabled = useHelpersEnabled();

    if (!ctx) {
        // Still allow read/write via the store when provider is missing (e.g. tests).
        return {
            helpersEnabled,
            setHelpersEnabled: writeHelpersEnabled,
            toggleHelpers: () => writeHelpersEnabled(!readHelpersEnabled()),
        };
    }

    return ctx;
}
