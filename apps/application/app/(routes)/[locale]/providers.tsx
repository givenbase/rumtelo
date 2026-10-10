'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, useState, type ReactNode } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { ThemeProvider, BrandLoader } from '@rumtelo/ui';

import { setClientHouseholdId } from '@/app/_lib/household-api-context';
import { AccountThemeProvider } from '@/components/features/shell/account-theme-sync';
import { HouseholdShellProvider } from '@/components/features/shell/household-shell-context';
import { AuthProvider, useAuth } from '@/components/features/shell/auth-provider';
import { PlanIntentProvider } from '@/components/features/shell/plan-intent-provider';
import { PracticeInviteProvider } from '@/components/features/shell/practice-invite-provider';
import { ToastPill } from '@/components/layout/toast';

/** Keeps OpenAPILink headers in sync without remounting the oRPC client. */
function HouseholdHeaderSync({ children }: { children: ReactNode }) {
    const { householdId } = useAuth();
    useEffect(() => {
        setClientHouseholdId(householdId);
    }, [householdId]);
    return children;
}

function ProvidersFallback() {
    const t = useTranslations('ui.statusPage');
    return <BrandLoader fullScreen label={t('loading')} />;
}

export function Providers({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        staleTime: 30_000,
                        retry: (failureCount, error) => {
                            const status = (error as { status?: number })?.status;
                            if (status === 401 || status === 403) return false;
                            return failureCount < 2;
                        },
                    },
                },
            })
    );

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                {/*
                  Auth must sit above the Suspense that catches useSearchParams
                  (PlanIntentProvider / route pages). If AuthProvider is inside that
                  boundary, a suspend unmounts it and concurrent renders can throw
                  “useAuth must be used inside <AuthProvider>”.
                */}
                <AuthProvider>
                    {/*
                      Board period lives here (above Suspense). PlanIntent / PracticeInvite
                      use searchParams and can remount the Suspense tree — period must not
                      reset when the user is fixing a prior open month across pages.
                    */}
                    <HouseholdShellProvider>
                        <Suspense fallback={<ProvidersFallback />}>
                            <PlanIntentProvider>
                                <PracticeInviteProvider>
                                    <HouseholdHeaderSync>
                                        <AccountThemeProvider>
                                            {children}
                                            <ToastPill />
                                        </AccountThemeProvider>
                                    </HouseholdHeaderSync>
                                </PracticeInviteProvider>
                            </PlanIntentProvider>
                        </Suspense>
                    </HouseholdShellProvider>
                </AuthProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
