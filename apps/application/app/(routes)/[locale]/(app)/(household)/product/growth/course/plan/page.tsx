import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';

import { PlanPage } from '../_components/plan-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('course_plan') };
}

/** COURSE › PLAN YOUR YEAR — a short intake that sets up the year's goals, steps and routines. */
export default function Page() {
    return (
        <Suspense>
            <PlanPage />
        </Suspense>
    );
}
