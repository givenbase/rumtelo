'use client';

import { useCallback, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
    forceClearPracticePreview,
    getPracticePreviewSnapshot,
    hydratePracticePreview,
    setPracticePreview,
    subscribePracticePreview,
    type PracticePreviewSession,
} from '@/app/_lib/practice-preview';
import {
    practicePreviewCapabilities,
    type PracticePreviewCapabilities,
} from '@/app/_lib/practice-preview-capabilities';

hydratePracticePreview();

export function usePracticePreview(): {
    preview: PracticePreviewSession | null;
    capabilities: PracticePreviewCapabilities;
    enterPreview: (session: PracticePreviewSession) => void;
    /** Clears preview headers/storage and drops cached client-scoped queries. */
    exitPreview: () => void;
} {
    const queryClient = useQueryClient();
    const preview = useSyncExternalStore(
        subscribePracticePreview,
        getPracticePreviewSnapshot,
        () => null
    );

    const capabilities = useMemo(() => practicePreviewCapabilities(preview), [preview]);

    const enterPreview = useCallback((session: PracticePreviewSession) => {
        setPracticePreview(session);
    }, []);

    const exitPreview = useCallback(() => {
        // 1) Drop headers immediately (memory + sessionStorage).
        forceClearPracticePreview();
        // 2) Cancel in-flight client-scoped fetches, then refetch under BA household.
        void queryClient.cancelQueries().then(() => queryClient.invalidateQueries());
    }, [queryClient]);

    return { preview, capabilities, enterPreview, exitPreview };
}

/** Optional mount — keeps hydrate call in the tree for SSR safety. */
export function PracticePreviewGate({ children }: { children: ReactNode }) {
    return children;
}
