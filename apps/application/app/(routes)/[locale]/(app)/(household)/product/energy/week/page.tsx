import { getTranslations } from '@rumtelo/i18n';

import { WeekPageClient } from './_components/week-page';

export async function generateMetadata() {
    const t = await getTranslations('features.energy.week');
    return { title: t('page_title') };
}

export default function WeekPage() {
    return <WeekPageClient />;
}
