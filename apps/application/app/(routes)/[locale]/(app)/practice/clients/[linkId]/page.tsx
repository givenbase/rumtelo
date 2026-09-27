import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeClientDetailPage } from '../../_components/practice-client-detail-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('clients.detail_title') };
}

export default async function PracticeClientDetailRoute({
    params,
}: {
    params: Promise<{ linkId: string }>;
}) {
    const { linkId } = await params;
    return <PracticeClientDetailPage linkId={linkId} />;
}
