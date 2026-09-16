'use client';

import { Suspense, type ReactNode } from 'react';

import { ThemeProvider } from '@rumtelo/ui';

import { AccountThemeProvider } from '@/app/_components/account-theme-sync';
import { MarketingSessionProvider } from '@/app/_components/marketing-session-provider';
import { PlanIntentProvider } from '@/app/_components/plan-intent-provider';
import { SignUpDraftProvider } from '@/app/_components/sign-up-draft-provider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <Suspense fallback={null}>
                <MarketingSessionProvider>
                    <AccountThemeProvider>
                        <PlanIntentProvider>
                            <SignUpDraftProvider>{children}</SignUpDraftProvider>
                        </PlanIntentProvider>
                    </AccountThemeProvider>
                </MarketingSessionProvider>
            </Suspense>
        </ThemeProvider>
    );
}
