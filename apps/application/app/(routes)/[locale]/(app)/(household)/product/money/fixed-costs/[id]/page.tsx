import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { FixedCostDetailPageClient } from '../_components/fixed-cost-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('fixed_cost') };
}

export default async function FixedCostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <FixedCostDetailPageClient fixedCostId={id} />;
}
