import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeOverviewPage } from './_components/practice-overview-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('overview.title') };
}

export default function PracticePage() {
    return <PracticeOverviewPage />;
}
