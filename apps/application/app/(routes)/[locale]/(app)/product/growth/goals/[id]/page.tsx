import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { GoalDetailPageClient } from '../_components/goal-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('goal') };
}

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <GoalDetailPageClient goalId={id} />;
}
