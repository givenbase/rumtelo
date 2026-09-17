import { notFound } from 'next/navigation';

import { DebtDetailPageClient } from '../_components/debt-detail-page';

export const metadata = { title: 'Debt' };

export default async function DebtDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) notFound();

    return <DebtDetailPageClient debtId={id} />;
}
