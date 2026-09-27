import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { DebtDetailPageClient } from '../_components/debt-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('debt') };
}

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <DebtDetailPageClient debtId={id} />;
}
