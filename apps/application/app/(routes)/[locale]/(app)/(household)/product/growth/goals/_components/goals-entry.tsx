'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslations } from '@rumtelo/i18n';
import { BrandLoader } from '@rumtelo/ui';

import { CAPABILITIES } from '@/app/_lib/plan';
import { useHouseholdShell } from '@/components/features/shell/household-shell-context';
import { usePlanCapabilities } from '@/components/features/shell/use-plan-capabilities';
import { courseHref } from '@/product/growth/course/_utils/course-route';

import { CoursePreviewCard } from './course-preview-card';
import { GoalsPageClient } from './goals-page';

/**
 * `/growth/goals`: money goals live in Course › Goals now, so with Course open this
 * moves there (old links, the Growth hub and closed goal forms still land well). Basic has
 * no Course, so it keeps the standalone money-goals list with a Course preview card on top.
 */
export function GoalsEntry() {
    const t = useTranslations('ui.statusPage');
    const router = useRouter();
    const { period, planReady } = useHouseholdShell();
    const { isCapabilityLocked } = usePlanCapabilities();
    const hasCourse = planReady && !isCapabilityLocked(CAPABILITIES.growthCourse);
    const goalsHref = courseHref(`${period.year}-${String(period.month).padStart(2, '0')}`);

    useEffect(() => {
        if (hasCourse) router.replace(goalsHref);
    }, [hasCourse, goalsHref, router]);

    if (!planReady || hasCourse) return <BrandLoader label={t('loading')} />;
    return (
        <>
            <CoursePreviewCard />
            <GoalsPageClient />
        </>
    );
}
