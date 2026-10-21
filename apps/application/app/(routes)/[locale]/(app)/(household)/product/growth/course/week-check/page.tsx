import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';

import { WeekCheckPage } from '../_components/week-check-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('course_week_check') };
}

/** COURSE › WEEK CHECK — look back, routines, the next 3. On Sunday it plans next week. */
export default function Page() {
    return (
        <Suspense>
            <WeekCheckPage />
        </Suspense>
    );
}
