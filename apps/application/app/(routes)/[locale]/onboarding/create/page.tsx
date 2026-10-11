'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { setActiveOrganization } from '@/app/_lib/auth';
import { useBoardWriteAccess } from '@/app/_lib/use-board-write-access';
import { useAuth } from '@/components/features/shell/auth-provider';
import { OnboardingFlow } from '../_components/onboarding-flow';

/**
 * Soft upgrade — VIEWER (look-along) starts their own household.
 * Cleared active household so creator onboarding can run without fighting the
 * invitee board gate. Writable members are blocked server-side.
 */
export default function CreateOwnHouseholdPage() {
    const t = useTranslations();
    const router = useRouter();
    const { session, isPending, householdId, householdReady, refreshSession } = useAuth();
    const { membershipRole, membershipPending, role } = useBoardWriteAccess();
    const detachStarted = useRef(false);

    const lookAlongSeat =
        membershipRole === HouseholdRole.VIEWER ||
        (!membershipPending && !membershipRole && role === HouseholdRole.VIEWER);

    useEffect(() => {
        if (isPending || !householdReady || !session) return;
        if (!householdId) return;
        if (membershipPending) return;

        if (membershipRole && membershipRole !== HouseholdRole.VIEWER) {
            router.replace('/');
            return;
        }

        if (!lookAlongSeat || detachStarted.current) return;
        detachStarted.current = true;
        void (async () => {
            try {
                await setActiveOrganization(null);
                await refreshSession();
            } catch {
                detachStarted.current = false;
            }
        })();
    }, [
        householdId,
        householdReady,
        isPending,
        lookAlongSeat,
        membershipPending,
        membershipRole,
        refreshSession,
        router,
        session,
    ]);

    if (isPending || !householdReady || membershipPending) {
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

    if (membershipRole && membershipRole !== HouseholdRole.VIEWER) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Still clearing active household after VIEWER detach.
    if (householdId && lookAlongSeat) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return (
        <OnboardingFlow
            onHouseholdReady={() => {
                router.replace('/onboarding');
            }}
        />
    );
}
