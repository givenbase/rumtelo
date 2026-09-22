import { getTranslations } from '@rumtelo/i18n';

import { CoachPageClient } from './_components/coach-page';

export async function generateMetadata() {
    const t = await getTranslations('features.coach');
    return { title: t('page_title') };
}

export default function CoachPage() {
    return <CoachPageClient />;
}
