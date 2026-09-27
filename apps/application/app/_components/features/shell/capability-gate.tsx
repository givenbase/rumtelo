'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';

import { usePathname, useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { PlanKey } from '@/app/_lib/plan';
import { productPath } from '@/app/_lib/routes';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { LockedGate } from '@/components/features/shell/locked-gate';
import { usePracticePreview } from '@/components/features/shell/practice-preview';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

function isCoachTeachingPath(pathname: string): boolean {
    const path = pathname.replace(/^\/(en|nl|es|fr)(?=\/|$)/, '') || '/';
    return (
        path === productPath('coach') ||
        path.startsWith(`${productPath('coach')}/`) ||
        path === productPath('why') ||
        path.startsWith(`${productPath('why')}/`)
    );
}

/**
 * Path-level gate — when the route's capability is locked for the active plan,
 * renders only LockedGate (no page content). Shows BrandLoader until plan is ready.
 * Practice preview: Coach / Why teaching routes redirect home.
 */
export function CapabilityGate({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname();
    const router = useRouter();
    const { planReady } = useHouseholdShell();
    const { accessForPath } = usePlanCapabilities();
    const { capabilities } = usePracticePreview();
    const access = accessForPath(pathname);
    const blockCoach = !capabilities.showCoachNav && isCoachTeachingPath(pathname);

    useEffect(() => {
        if (blockCoach) router.replace('/');
    }, [blockCoach, router]);

    if (!planReady) {
        return <BrandLoader label={t('ui.statusPage.loading')} />;
    }

    if (blockCoach) {
        return <BrandLoader label={t('ui.statusPage.loading')} />;
    }

    if (!access.locked) return children;

    return (
        <LockedGate
            requiredPlan={access.requiredPlan ?? PlanKey.PLUS}
            capabilityKey={access.capabilityKey}
        />
    );
}
