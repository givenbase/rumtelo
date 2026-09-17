'use client';

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';

import { PlanKey } from '@rumtelo/contracts';

import { api } from '@/lib/api';
import {
    activeHouseholdId,
    listOrganizations,
    sessionUserId,
    setActiveOrganization,
    signOut as authSignOut,
    useSession,
    type Session,
} from '@/lib/auth';
import { setClientHouseholdId } from '@/lib/household-api-context';

interface MarketingSessionCtx {
    isPending: boolean;
    isAuthenticated: boolean;
    user: Session['user'] | null;
    householdId: string | null;
    /** Active household plan when known; null while loading or before onboard. */
    planKey: PlanKey | null;
    planPending: boolean;
    signOut: () => Promise<void>;
}

const MarketingSessionContext = createContext<MarketingSessionCtx | null>(null);

function toSession(data: ReturnType<typeof useSession>['data']): Session | null | undefined {
    if (data === null || data === undefined) return data;
    const userId = data.user?.id;
    if (!userId) return null;
    return {
        session: { activeOrganizationId: data.session?.activeOrganizationId ?? null },
        user: {
            id: userId,
            name: data.user?.name ?? null,
            email: data.user?.email ?? null,
            image: data.user?.image ?? null,
        },
    };
}

function parsePlanKey(value: unknown): PlanKey | null {
    if (value === PlanKey.BASIC || value === PlanKey.PLUS || value === PlanKey.MAX) {
        return value;
    }
    return null;
}

type PlanFetch = { householdId: string; planKey: PlanKey | null };

export function MarketingSessionProvider({ children }: { children: ReactNode }) {
    const { data, isPending, refetch } = useSession();
    const session = toSession(data);
    const activating = useRef(false);
    const refetchRef = useRef(refetch);

    useEffect(() => {
        refetchRef.current = refetch;
    }, [refetch]);

    const householdId = activeHouseholdId(session);
    const userId = sessionUserId(session);
    const user = session?.user ?? null;
    const isAuthenticated = Boolean(userId);

    // Keep oRPC headers in sync without React state.
    setClientHouseholdId(householdId);

    const [planFetch, setPlanFetch] = useState<PlanFetch | null>(null);

    const canLoadPlan = isAuthenticated && Boolean(householdId);
    const planKey =
        canLoadPlan && planFetch?.householdId === householdId ? planFetch.planKey : null;
    const planPending = canLoadPlan && planFetch?.householdId !== householdId;

    // First visit: activate the only household if the session has none.
    useEffect(() => {
        if (isPending || !session?.user || householdId || activating.current) return;
        activating.current = true;
        void (async () => {
            try {
                const orgs = await listOrganizations();
                const first = orgs.data?.[0];
                if (first?.id) {
                    await setActiveOrganization(first.id);
                    await refetchRef.current();
                }
            } finally {
                activating.current = false;
            }
        })();
    }, [isPending, session?.user, householdId]);

    // Async plan read — state updates only after the fetch settles.
    useEffect(() => {
        if (!isAuthenticated || !householdId) return;

        let cancelled = false;
        void (async () => {
            try {
                const settings = await api.household.settings({ householdId });
                if (cancelled) return;
                setPlanFetch({
                    householdId,
                    planKey: parsePlanKey(settings.planKey) ?? PlanKey.BASIC,
                });
            } catch {
                if (!cancelled) setPlanFetch({ householdId, planKey: null });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthenticated, householdId]);

    const signOut = useCallback(async () => {
        setPlanFetch(null);
        setClientHouseholdId(null);
        await authSignOut();
        await refetchRef.current();
    }, []);

    const value = useMemo(
        () => ({
            isPending,
            isAuthenticated,
            user,
            householdId,
            planKey,
            planPending,
            signOut,
        }),
        [isPending, isAuthenticated, user, householdId, planKey, planPending, signOut]
    );

    return (
        <MarketingSessionContext.Provider value={value}>
            {children}
        </MarketingSessionContext.Provider>
    );
}

export function useMarketingSession(): MarketingSessionCtx {
    const ctx = useContext(MarketingSessionContext);
    if (!ctx) {
        throw new Error('useMarketingSession must be used inside <MarketingSessionProvider>');
    }
    return ctx;
}

/** Optional — landing sections that render outside the provider stay anonymous. */
export function useOptionalMarketingSession(): MarketingSessionCtx | null {
    return useContext(MarketingSessionContext);
}

export function initialsFromUser(
    name: string | null | undefined,
    email: string | null | undefined
) {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
        return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
    }
    if (parts[0]?.length) return parts[0].slice(0, 2).toUpperCase();
    return ((email ?? '').slice(0, 2) || '?').toUpperCase();
}
