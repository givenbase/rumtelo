import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { AssetDetailPageClient } from '../_components/asset-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('asset') };
}

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <AssetDetailPageClient assetId={id} />;
}
