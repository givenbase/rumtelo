'use client';

/**
 * Holds the product shell until auth + household plan are known,
 * so Plus/Max routes never flash the 🔒 upgrade wall as Basic.
 *
 * Onboarding redirects live in `proxy.ts` (`rumtelo-onboarded` cookie) — not here.
 * Practice-only staff (practice member, no BA household, no client preview) still
 * go to `/practice` here — proxy cannot see practice membership.
 */

import { useEffect, type ReactNode } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useLiveQuery } from '@rumtelo/hooks';
import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { apiQuery } from '@/app/_lib/api-hooks';
import { PRACTICE, practicePath } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { HouseholdShell } from '@/components/layout/household-shell';

export function AppBootGate({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname();
    const router = useRouter();
    const { planReady } = useHouseholdShell();
    const { isAuthenticated, householdReady, householdId, isPracticePreview, isPending } =
        useAuth();

    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    const isPractice = path === PRACTICE || path.startsWith(`${PRACTICE}/`);

    const practiceListQuery = useLiveQuery(
        apiQuery.practice.list.queryOptions(),
        [],
        isAuthenticated && householdReady && !isPractice
    );
    const hasPractice = (practiceListQuery.data?.length ?? 0) > 0;
    const practiceListKnown = practiceListQuery.isFetched || practiceListQuery.isError;

    /** Practice staff without a personal household and without client preview. */
    const practiceOnlyAwayFromBoard =
        !isPractice &&
        !isPending &&
        householdReady &&
        isAuthenticated &&
        !isPracticePreview &&
        !householdId &&
        practiceListKnown &&
        hasPractice;

    useEffect(() => {
        if (!practiceOnlyAwayFromBoard) return;
        router.replace(practicePath());
    }, [practiceOnlyAwayFromBoard, router]);

    if (!planReady) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    if (isPractice) {
        return (
            <>
                {children}
                {modal}
            </>
        );
    }

    if (practiceOnlyAwayFromBoard || (isAuthenticated && !householdId && !practiceListKnown)) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return (
        <HouseholdShell>
            {children}
            {modal}
        </HouseholdShell>
    );
}
