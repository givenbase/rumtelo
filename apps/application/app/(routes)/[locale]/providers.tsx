'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Suspense, useEffect, useState, type ReactNode } from 'react';

import { ThemeProvider, BrandLoader } from '@rumtelo/ui';

import { setClientHouseholdId } from '@/app/_lib/household-api-context';
import { AccountThemeProvider } from '@/components/features/shell/account-theme-sync';
import { AppShellProvider } from '@/components/features/shell/app-shell-context';
import { AuthProvider, useAuth } from '@/components/features/shell/auth-provider';
import { PlanIntentProvider } from '@/components/features/shell/plan-intent-provider';

/** Keeps OpenAPILink headers in sync without remounting the oRPC client. */
function HouseholdHeaderSync({ children }: { children: ReactNode }) {
    const { householdId } = useAuth();
    useEffect(() => {
        setClientHouseholdId(householdId);
    }, [householdId]);
    return children;
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
                <Suspense fallback={<BrandLoader fullScreen label="Loading" />}>
                    <PlanIntentProvider>
                        <AuthProvider>
                            <HouseholdHeaderSync>
                                <AccountThemeProvider>
                                    <AppShellProvider>{children}</AppShellProvider>
                                </AccountThemeProvider>
                            </HouseholdHeaderSync>
                        </AuthProvider>
                    </PlanIntentProvider>
                </Suspense>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
