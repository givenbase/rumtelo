import { notFound } from 'next/navigation';

import { FixedCostDetailPageClient } from '../_components/fixed-cost-detail-page';

export const metadata = { title: 'Fixed cost' };

export default async function FixedCostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <FixedCostDetailPageClient fixedCostId={id} />;
}
