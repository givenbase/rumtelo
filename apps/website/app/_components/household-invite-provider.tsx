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
    clearHouseholdInvite,
    getHouseholdInviteServerSnapshot,
    getHouseholdInviteSnapshot,
    householdInviteFromSearchParams,
    parseHouseholdInviteId,
    subscribeHouseholdInvite,
    writeHouseholdInvite,
} from '@rumtelo/utils';

import { env } from '@/lib/get-env';

type HouseholdInviteContextValue = {
    invitationId: string | null;
    setInvitationId: (next: string | null) => void;
    clearInvitationId: () => void;
};

const HouseholdInviteContext = createContext<HouseholdInviteContextValue | null>(null);

function domainUrls() {
    return [env.NEXT_PUBLIC_DOMAIN_WEB, env.NEXT_PUBLIC_DOMAIN_APP];
}

/**
 * Carries household email invite id across marketing sign-up → verify → app.
 */
export function HouseholdInviteProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const storedSnapshot = useSyncExternalStore(
        subscribeHouseholdInvite,
        getHouseholdInviteSnapshot,
        getHouseholdInviteServerSnapshot
    );
    const stored = useMemo(() => parseHouseholdInviteId(storedSnapshot || null), [storedSnapshot]);

    const fromQuery = useMemo(() => householdInviteFromSearchParams(searchParams), [searchParams]);

    const invitationId = fromQuery ?? stored;

    useEffect(() => {
        if (fromQuery && fromQuery !== storedSnapshot) {
            writeHouseholdInvite(fromQuery, { domainUrls: domainUrls() });
        }
    }, [fromQuery, storedSnapshot]);

    const setInvitationId = useCallback((next: string | null) => {
        writeHouseholdInvite(next, { domainUrls: domainUrls() });
    }, []);

    const clearInvitationId = useCallback(() => {
        clearHouseholdInvite({ domainUrls: domainUrls() });
    }, []);

    const value = useMemo(
        () => ({ invitationId, setInvitationId, clearInvitationId }),
        [invitationId, setInvitationId, clearInvitationId]
    );

    return (
        <HouseholdInviteContext.Provider value={value}>{children}</HouseholdInviteContext.Provider>
    );
}

export function useOptionalHouseholdInvite(): HouseholdInviteContextValue | null {
    return useContext(HouseholdInviteContext);
}
