'use client';

import { useEffect } from 'react';

import { useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { CAPABILITIES } from '@/app/_lib/plan';
import { growthPath } from '@/app/_lib/routes';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';

/**
 * `/product/growth` for typed or old links. The Growth tab already links straight to the
 * target, so this only redirects: Course with Plus and Max, the 1-goal list on Basic.
 */
export function GrowthEntry() {
    const t = useTranslations('ui.statusPage');
    const router = useRouter();
    const { planReady } = useHouseholdShell();
    const { isCapabilityLocked } = usePlanCapabilities();
    const target = isCapabilityLocked(CAPABILITIES.growthCourse)
        ? growthPath('goals')
        : growthPath('course');

    useEffect(() => {
        if (planReady) router.replace(target);
    }, [planReady, target, router]);

    return <BrandLoader label={t('loading')} />;
}
