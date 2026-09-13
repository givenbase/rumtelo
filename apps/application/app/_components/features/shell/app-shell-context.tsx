'use client';

import { apiQuery } from '@/app/_lib/api-hooks';
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

import { Locale, type PlanKey } from '@rumtelo/contracts';
import { useQuery } from '@tanstack/react-query';

import { DEFAULT_PLAN } from '@/app/_lib/plan';
import { resolvePreviewPlan } from '@/app/_lib/preview';
import { useAuth } from '@/components/features/shell/auth-provider';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export interface Period {
    year: number;
    month: number;
}

interface AppShellCtx {
    toast: Toast | null;
    showToast: (message: string, type?: Toast['type']) => void;
    quickOpen: boolean;
    setQuickOpen: (open: boolean) => void;
    toggleQuick: () => void;
    onboardingOpen: boolean;
    onboardingStep: number;
    openOnboarding: (step?: number) => void;
    closeOnboarding: (completed?: boolean) => void;
    resetOnboardingFlow: () => void;
    setOnboardingStep: (step: number) => void;
    plan: PlanKey;
    /** False until auth + household settings resolve — do not trust plan locks yet. */
    planReady: boolean;
    setPlan: (plan: PlanKey) => void;
    period: Period;
    setPeriod: (period: Period) => void;
    locale: Locale;
    toggleLocale: () => void;
}

const AppShellContext = createContext<AppShellCtx | null>(null);

export function AppShellProvider({ children }: { children: ReactNode }) {
    const { householdId, isPending: authPending, isAuthenticated } = useAuth();
    const [toast, setToast] = useState<Toast | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const toastId = useRef(0);

    const [quickOpen, setQuickOpen] = useState(false);
    const [onboardingOpen, setOnboardingOpen] = useState(false);
    const [onboardingStep, setOnboardingStep] = useState(0);
    const [locale, setLocale] = useState<Locale>(Locale.EN);

    const now = new Date();
    const [period, setPeriod] = useState<Period>({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
    });

    const settingsQuery = useQuery({
        ...apiQuery.household.settings.queryOptions({
            input: { householdId: householdId! },
        }),
        enabled: Boolean(householdId),
    });

    const settingsPlanKey = settingsQuery.data?.planKey;
    const basePlan = resolvePreviewPlan(settingsPlanKey ?? DEFAULT_PLAN);
    /** Manual override — cleared automatically when settings `planKey` changes. */
    const [planBump, setPlanBump] = useState<{ key: string | undefined; plan: PlanKey } | null>(
        null
    );
    const plan = planBump && planBump.key === settingsPlanKey ? planBump.plan : basePlan;
    const setPlan = useCallback(
        (next: PlanKey) => setPlanBump({ key: settingsPlanKey, plan: next }),
        [settingsPlanKey]
    );

    /**
     * Auth / household / settings still settling → plan is not authoritative.
     * Using DEFAULT_PLAN (Basic) here would flash LockedGate on Plus/Max routes.
     */
    const planReady = useMemo(() => {
        if (authPending) return false;
        if (isAuthenticated && !householdId) return false;
        if (!householdId) return true;
        return settingsQuery.isFetched || settingsQuery.isError;
    }, [authPending, isAuthenticated, householdId, settingsQuery.isFetched, settingsQuery.isError]);

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        const id = ++toastId.current;
        setToast({ id, message, type });
        toastTimer.current = setTimeout(() => setToast(null), 2800);
    }, []);

    const toggleQuick = useCallback(() => setQuickOpen(previous => !previous), []);

    const openOnboarding = useCallback((step = 0) => {
        setOnboardingStep(step);
        setOnboardingOpen(true);
    }, []);

    const closeOnboarding = useCallback((_completed = false) => {
        setOnboardingOpen(false);
        setOnboardingStep(0);
        // Durable flag is account/household settings.onboardedAt (set by API).
    }, []);

    const resetOnboardingFlow = useCallback(() => {
        setOnboardingStep(0);
        setOnboardingOpen(true);
    }, []);

    const toggleLocale = useCallback(
        () => setLocale(previous => (previous === Locale.NL ? Locale.EN : Locale.NL)),
        []
    );

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setQuickOpen(previous => !previous);
            }
            if (event.key === 'Escape') {
                setQuickOpen(false);
                setOnboardingOpen(false);
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const ctxValue = useMemo(
        () => ({
            toast,
            showToast,
            quickOpen,
            setQuickOpen,
            toggleQuick,
            onboardingOpen,
            onboardingStep,
            openOnboarding,
            closeOnboarding,
            resetOnboardingFlow,
            setOnboardingStep,
            plan,
            planReady,
            setPlan,
            period,
            setPeriod,
            locale,
            toggleLocale,
        }),
        [
            toast,
            showToast,
            quickOpen,
            setQuickOpen,
            toggleQuick,
            onboardingOpen,
            onboardingStep,
            openOnboarding,
            closeOnboarding,
            resetOnboardingFlow,
            setOnboardingStep,
            plan,
            planReady,
            setPlan,
            period,
            setPeriod,
            locale,
            toggleLocale,
        ]
    );

    return <AppShellContext.Provider value={ctxValue}>{children}</AppShellContext.Provider>;
}

export function useAppShell(): AppShellCtx {
    const ctx = useContext(AppShellContext);
    if (!ctx) throw new Error('useAppShell must be used inside <AppShellProvider>');
    return ctx;
}
