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

import {
    activeHouseholdId,
    listOrganizations,
    sessionUserId,
    setActiveOrganization,
    useSession,
    type Session,
} from '@/app/_lib/auth';

interface AuthCtx {
    session: Session | null | undefined;
    /** Better Auth user — null while loading or signed out. */
    user: Session['user'] | null;
    /** Better Auth `user.id` (opaque AuthId). */
    userId: string | null;
    /** Active household id (opaque AuthId). Null until onboarded / activated. */
    householdId: string | null;
    isPending: boolean;
    /**
     * False until the first-login household activation attempt finishes
     * (list orgs → set active, or confirm none). Lets boot wait without
     * deadlocking new users who have no household yet.
     */
    householdReady: boolean;
    isAuthenticated: boolean;
    refreshSession: () => Promise<void>;
    /** Sets BA active organization (= Rumtelo household) and refreshes session. */
    setActiveHousehold: (householdId: string) => Promise<void>;
}

const AuthContext = createContext<AuthCtx | null>(null);

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

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data, isPending, refetch } = useSession();
    const session = toSession(data);
    const activating = useRef(false);
    /** User id whose org-activation attempt has finished (including "none"). */
    const [activatedForUserId, setActivatedForUserId] = useState<string | null>(null);

    const householdId = activeHouseholdId(session);
    const userId = sessionUserId(session);
    const user = session?.user ?? null;
    const isAuthenticated = Boolean(userId);

    const householdReady = useMemo(() => {
        if (isPending) return false;
        if (!userId) return true;
        if (householdId) return true;
        return activatedForUserId === userId;
    }, [isPending, userId, householdId, activatedForUserId]);

    const refetchRef = useRef(refetch);
    useEffect(() => {
        refetchRef.current = refetch;
    }, [refetch]);

    const refreshSession = useCallback(async () => {
        await refetch();
    }, [refetch]);

    const setActiveHousehold = useCallback(
        async (nextHouseholdId: string) => {
            await setActiveOrganization(nextHouseholdId);
            await refetch();
        },
        [refetch]
    );

    // First login / demo: activate the only household if session has none.
    // After the attempt (including empty list), mark this user activated so
    // AppBootGate can open onboarding instead of spinning forever.
    useEffect(() => {
        if (isPending || !userId || householdId) return;
        if (activatedForUserId === userId || activating.current) return;
        activating.current = true;
        const targetUserId = userId;
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
                setActivatedForUserId(targetUserId);
            }
        })();
    }, [isPending, userId, householdId, activatedForUserId]);

    const value = useMemo(
        () => ({
            session,
            user,
            userId,
            householdId,
            isPending,
            householdReady,
            isAuthenticated,
            refreshSession,
            setActiveHousehold,
        }),
        [
            session,
            user,
            userId,
            householdId,
            isPending,
            householdReady,
            isAuthenticated,
            refreshSession,
            setActiveHousehold,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
    return ctx;
}

/** Active household AuthId, or null if none selected. */
export function useHouseholdId(): string | null {
    return useAuth().householdId;
}

/** Active household AuthId — throws if missing (call after onboarding). */
export function useRequireHouseholdId(): string {
    const id = useHouseholdId();
    if (!id) throw new Error('No active household — complete onboarding first');
    return id;
}

/** Better Auth user id, or null if signed out. */
export function useUserId(): string | null {
    return useAuth().userId;
}

/** Better Auth user id — throws if signed out. */
export function useRequireUserId(): string {
    const id = useUserId();
    if (!id) throw new Error('Not signed in');
    return id;
}
