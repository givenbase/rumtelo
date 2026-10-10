'use client';

import { Suspense, type ReactNode } from 'react';

import { ThemeProvider, Toaster } from '@rumtelo/ui';

import { AccountThemeProvider } from '@/app/_components/account-theme-sync';
import { MarketingSessionProvider } from '@/app/_components/marketing-session-provider';
import { PlanIntentProvider } from '@/app/_components/plan-intent-provider';
import { HouseholdInviteProvider } from '@/app/_components/household-invite-provider';
import { PracticeInviteProvider } from '@/app/_components/practice-invite-provider';
import { SignUpDraftProvider } from '@/app/_components/sign-up-draft-provider';

export function Providers({ children }: { children: ReactNode }) {
    return (
        <ThemeProvider>
            <Suspense fallback={null}>
                <MarketingSessionProvider>
                    <AccountThemeProvider>
                        <PlanIntentProvider>
                            <PracticeInviteProvider>
                                <HouseholdInviteProvider>
                                    <SignUpDraftProvider>{children}</SignUpDraftProvider>
                                </HouseholdInviteProvider>
                            </PracticeInviteProvider>
                        </PlanIntentProvider>
                    </AccountThemeProvider>
                </MarketingSessionProvider>
            </Suspense>
            <Toaster />
        </ThemeProvider>
    );
}
