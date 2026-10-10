'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { HouseholdRole } from '@rumtelo/contracts';
import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { setActiveOrganization } from '@/app/_lib/auth';
import { apiQuery } from '@/app/_lib/api-hooks';
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
    const { session, isPending, householdId, householdReady, userId, refreshSession } = useAuth();

    const membersQuery = useLiveQuery(
        apiQuery.household.members.queryOptions({ input: { householdId: householdId! } }),
        [],
        Boolean(householdId)
    );

    const myRole = membersQuery.data.find(member => member.userId === userId)?.role;
    const isViewerOnlySeat = !householdId || myRole === HouseholdRole.VIEWER;

    useEffect(() => {
        if (isPending || !householdReady || !session) return;
        if (!householdId) return;
        if (myRole && myRole !== HouseholdRole.VIEWER) {
            router.replace('/');
            return;
        }
        // Detach look-along seat so questionnaire creates a new OWNER board.
        if (myRole === HouseholdRole.VIEWER) {
            void (async () => {
                await setActiveOrganization(null);
                await refreshSession();
            })();
        }
    }, [householdId, householdReady, isPending, myRole, refreshSession, router, session]);

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

    if (!isViewerOnlySeat) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    // Still clearing active household after VIEWER detach.
    if (householdId && myRole === HouseholdRole.VIEWER) {
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
