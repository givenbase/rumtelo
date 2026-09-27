'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useSyncExternalStore,
    type ReactNode,
} from 'react';
import { useSearchParams } from 'next/navigation';

import {
    clearPracticeInvite,
    getPracticeInviteServerSnapshot,
    getPracticeInviteSnapshot,
    parsePracticeInviteToken,
    practiceInviteFromSearchParams,
    subscribePracticeInvite,
    writePracticeInvite,
} from '@rumtelo/utils';

import { env } from '@/lib/get-env';

type PracticeInviteContextValue = {
    token: string | null;
    setToken: (next: string | null) => void;
    clearToken: () => void;
};

const PracticeInviteContext = createContext<PracticeInviteContextValue | null>(null);

function domainUrls() {
    return [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP];
}

/**
 * Carries Practice client invite token across marketing sign-up → verify → app.
 */
export function PracticeInviteProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const storedSnapshot = useSyncExternalStore(
        subscribePracticeInvite,
        getPracticeInviteSnapshot,
        getPracticeInviteServerSnapshot
    );
    const stored = useMemo(
        () => parsePracticeInviteToken(storedSnapshot || null),
        [storedSnapshot]
    );

    const fromQuery = useMemo(() => practiceInviteFromSearchParams(searchParams), [searchParams]);

    const token = fromQuery ?? stored;

    useEffect(() => {
        if (fromQuery && fromQuery !== storedSnapshot) {
            writePracticeInvite(fromQuery, { domainUrls: domainUrls() });
        }
    }, [fromQuery, storedSnapshot]);

    const setToken = useCallback((next: string | null) => {
        writePracticeInvite(next, { domainUrls: domainUrls() });
    }, []);

    const clearToken = useCallback(() => {
        clearPracticeInvite({ domainUrls: domainUrls() });
    }, []);

    const value = useMemo(() => ({ token, setToken, clearToken }), [token, setToken, clearToken]);

    return (
        <PracticeInviteContext.Provider value={value}>{children}</PracticeInviteContext.Provider>
    );
}

export function useOptionalPracticeInvite(): PracticeInviteContextValue | null {
    return useContext(PracticeInviteContext);
}
