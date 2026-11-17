'use client';

import { Suspense, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';
import { householdInvitePath } from '@rumtelo/utils';

import { useAuth } from '@/components/features/shell/auth-provider';
import { useOptionalHouseholdInvite } from '@/components/features/shell/household-invite-provider';
import { OnboardingFlow } from './_components/onboarding-flow';

/**
 * Onboarding UI for household creators only: two screens (income, then the split).
 * Proxy + `boardReady` (+ invitePath) own navigation for everyone who already has a board
 * or a pending invite. Bank mapping is no longer part of this page (Settings + Home checklist).
 */
export default function OnboardingPage() {
    const t = useTranslations();
    const router = useRouter();
    const { session, isPending, householdId, householdReady } = useAuth();
    const householdInvite = useOptionalHouseholdInvite();
    const pendingInviteId = householdInvite?.invitationId ?? null;

    useEffect(() => {
        if (householdId || !pendingInviteId) return;
        router.replace(householdInvitePath(pendingInviteId));
    }, [householdId, pendingInviteId, router]);

    if (isPending || !householdReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    if (!session) {
        return (
            <div className="flex flex-col items-center gap-4 py-12 text-center">
                <p className="text-sm text-fg-muted">{t('ui.statusPage.loading')}</p>
                <Link href="/sign-in" className="text-sm font-semibold text-accent hover:underline">
                    {t('features.auth.sign_in.submit')}
                </Link>
            </div>
        );
    }

    // Already on a household — wait for the proxy bounce to the board.
    if (householdId) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Invitee with a remembered invite — never the creator onboarding.
    if (pendingInviteId) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return (
        <Suspense>
            <OnboardingFlow />
        </Suspense>
    );
}
