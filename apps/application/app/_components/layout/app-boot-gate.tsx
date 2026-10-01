'use client';

/**
 * Holds the product shell until auth + household plan are known,
 * so Plus/Max routes never flash the 🔒 upgrade wall as Basic.
 *
 * Board / onboarding / practice-home redirects live only in `proxy.ts`
 * via `app/_lib/onboarding-gate.ts` + `account.boardReady` — not here.
 */

import { type ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { PRACTICE } from '@/app/_lib/routes';
import { useAuth } from '@/components/features/shell/auth-provider';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { HouseholdShell } from '@/components/layout/household-shell';

export function AppBootGate({ children, modal }: { children: ReactNode; modal: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname();
    const { planReady } = useHouseholdShell();
    const { householdId, isPending, isPracticePreview } = useAuth();

    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    const isPractice = path === PRACTICE || path.startsWith(`${PRACTICE}/`);

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

    // No personal household on the board — proxy should have sent unfinished /
    // practice-only users elsewhere. Soft-hold briefly; never block practice preview.
    if (!isPending && !householdId && !isPracticePreview) {
        return <BrandLoader fullScreen label={t('ui.statusPage.loading')} />;
    }

    return (
        <HouseholdShell>
            {children}
            {modal}
        </HouseholdShell>
    );
}
