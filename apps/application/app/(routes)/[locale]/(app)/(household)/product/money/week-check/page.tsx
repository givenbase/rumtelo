import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';

import { WeekCheckRoute } from './_components/week-check-flow';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('week_check') };
}

/** MONEY › WEEK CHECK: one routine. Money stages, then Course stages on Plus and Max. */
export default function WeekCheckPage() {
    return (
        <Suspense>
            <WeekCheckRoute />
        </Suspense>
    );
}
