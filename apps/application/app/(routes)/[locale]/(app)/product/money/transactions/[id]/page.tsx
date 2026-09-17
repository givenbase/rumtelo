import { notFound } from 'next/navigation';

import { TransactionDetailPageClient } from '../_components/transaction-detail-page';

export const metadata = { title: 'Transaction' };

export default async function TransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!id) notFound();

    return <TransactionDetailPageClient transactionId={id} />;
}
