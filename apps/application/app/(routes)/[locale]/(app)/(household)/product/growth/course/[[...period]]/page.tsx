import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';

import { CoursePage } from '../_components/course-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('course') };
}

/** COURSE — `/growth/course` opens Today; a day, `/2027-W10` (Week) or a month (Goals) zoom. */
export default async function Page({ params }: { params: Promise<{ period?: string[] }> }) {
    const { period } = await params;
    return (
        <Suspense>
            <CoursePage segment={period?.[0]} />
        </Suspense>
    );
}
