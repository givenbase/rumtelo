'use client';

import type { ReactNode } from 'react';

import { usePathname } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { PlanKey } from '@/app/_lib/plan';
import { useAppShell } from '@/components/features/shell/app-shell-context';
import { LockedGate } from '@/components/features/shell/locked-gate';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

/**
 * Path-level gate — when the route's capability is locked for the active plan,
 * renders only LockedGate (no page content). Shows BrandLoader until plan is ready.
 */
export function CapabilityGate({ children }: { children: ReactNode }) {
    const t = useTranslations();
    const pathname = usePathname();
    const { planReady } = useAppShell();
    const { accessForPath } = usePlanCapabilities();
    const access = accessForPath(pathname);

    if (!planReady) {
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
