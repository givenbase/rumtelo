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

import { type Locale, LOCALES, type PlanKey } from '@rumtelo/contracts';

import { fromIntlLocale, toIntlLocale, useLocale, usePathname, useRouter } from '@rumtelo/i18n';
import { isYearMonthBefore, periodTravelBounds } from '@rumtelo/utils';
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

interface HouseholdShellCtx {
    toast: Toast | null;
    showToast: (message: string, type?: Toast['type']) => void;
    quickOpen: boolean;
    setQuickOpen: (open: boolean) => void;
    toggleQuick: () => void;
    plan: PlanKey;
    /** False until auth + household settings resolve — do not trust plan locks yet. */
    planReady: boolean;
    setPlan: (plan: PlanKey) => void;
    period: Period;
    setPeriod: (period: Period) => void;
    /** Household creation time — drives period-travel floor (created month − 1). */
    householdCreatedAt: string | null;
    locale: Locale;
    toggleLocale: () => void;
    /** Switch UI + next-intl locale to a specific value. */
    setLocale: (next: Locale) => void;
}

const HouseholdShellContext = createContext<HouseholdShellCtx | null>(null);

export function HouseholdShellProvider({ children }: { children: ReactNode }) {
    const { householdId, isPending: authPending, householdReady } = useAuth();
    const intlLocale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [toast, setToast] = useState<Toast | null>(null);
    const toastTimer = useRef<ReturnType<typeof setTimeout>>(null);
    const toastId = useRef(0);

    const [quickOpen, setQuickOpen] = useState(false);
    /** Mirror next-intl cookie/locale — derive, don't sync via effect. */
    const locale: Locale = fromIntlLocale(intlLocale);

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
     *
     * Authenticated users with no household are ready once the org-activation
     * lookup finishes — otherwise AppBootGate spins forever and onboarding
     * (which creates the household) never mounts.
     */
    const planReady = useMemo(() => {
        if (authPending || !householdReady) return false;
        if (!householdId) return true;
        return settingsQuery.isFetched || settingsQuery.isError;
    }, [authPending, householdReady, householdId, settingsQuery.isFetched, settingsQuery.isError]);

    const householdCreatedAt = settingsQuery.data?.createdAt ?? null;

    if (householdCreatedAt) {
        const { floor } = periodTravelBounds(householdCreatedAt);
        if (isYearMonthBefore(period, floor)) {
            setPeriod(floor);
        }
    }

    const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        if (toastTimer.current) clearTimeout(toastTimer.current);
        const id = ++toastId.current;
        setToast({ id, message, type });
        toastTimer.current = setTimeout(() => setToast(null), 2800);
    }, []);

    const toggleQuick = useCallback(() => setQuickOpen(previous => !previous), []);

    const setLocale = useCallback(
        (next: Locale) => {
            const code = toIntlLocale(next);
            if (intlLocale !== code) {
                router.replace(pathname, { locale: code });
            }
        },
        [intlLocale, pathname, router]
    );

    const toggleLocale = useCallback(() => {
        const index = Math.max(0, LOCALES.indexOf(locale));
        const next = LOCALES[(index + 1) % LOCALES.length]!;
        setLocale(next);
    }, [locale, setLocale]);

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setQuickOpen(previous => !previous);
            }
            if (event.key === 'Escape') {
                setQuickOpen(false);
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
            plan,
            planReady,
            setPlan,
            period,
            setPeriod,
            householdCreatedAt,
            locale,
            toggleLocale,
            setLocale,
        }),
        [
            toast,
            showToast,
            quickOpen,
            setQuickOpen,
            toggleQuick,
            plan,
            planReady,
            setPlan,
            period,
            setPeriod,
            householdCreatedAt,
            locale,
            toggleLocale,
            setLocale,
        ]
    );

    return (
        <HouseholdShellContext.Provider value={ctxValue}>{children}</HouseholdShellContext.Provider>
    );
}

export function useHouseholdShell(): HouseholdShellCtx {
    const ctx = useContext(HouseholdShellContext);
    if (!ctx) throw new Error('useHouseholdShell must be used inside <HouseholdShellProvider>');
    return ctx;
}
