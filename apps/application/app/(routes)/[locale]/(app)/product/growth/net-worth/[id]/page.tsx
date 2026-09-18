import { notFound } from 'next/navigation';

import { AssetDetailPageClient } from '../_components/asset-detail-page';

export const metadata = { title: 'Asset' };

export default async function AssetDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <AssetDetailPageClient assetId={id} />;
}
