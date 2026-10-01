'use client';

import { useEffect, useRef } from 'react';

import { usePathname } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';

import { api } from '@/app/_lib/api';
import { useApiError } from '@/app/_lib/api-error-messages';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { useOptionalPracticeInvite } from '@/components/features/shell/practice-invite-provider';

/**
 * After signup/onboarding: redeem Practice email invite → INVITED client link
 * (household still accepts dual-consent in settings).
 */
export function PendingPracticeInviteRedeem() {
    const t = useTranslations();
    const apiError = useApiError();
    const { householdId, isPending } = useAuth();
    const pathname = usePathname();
    const { showToast } = useHouseholdShell();
    const practiceInvite = useOptionalPracticeInvite();
    const token = practiceInvite?.token ?? null;
    const inFlight = useRef(false);

    useEffect(() => {
        const isOnboarding = pathname.includes('/onboarding');
        if (isPending || !householdId || isOnboarding || !token || inFlight.current) return;

        inFlight.current = true;
        void (async () => {
            try {
                await api.practice.redeemClientInvite({ token, householdId });
                practiceInvite?.clearToken();
                showToast(t('pages.settings.practice_links.invite_redeemed'), 'success');
            } catch (error) {
                practiceInvite?.clearToken();
                showToast(apiError(error), 'error');
            } finally {
                inFlight.current = false;
            }
        })();
    }, [apiError, householdId, isPending, pathname, practiceInvite, showToast, t, token]);

    return null;
}
