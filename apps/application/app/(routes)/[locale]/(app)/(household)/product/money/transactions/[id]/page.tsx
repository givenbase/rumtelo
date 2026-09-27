import { getTranslations } from '@rumtelo/i18n';
import { notFound } from 'next/navigation';

import { TransactionDetailPageClient } from '../_components/transaction-detail-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('transaction') };
}

export default async function TransactionDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;
    if (!id) notFound();

    return <TransactionDetailPageClient transactionId={id} />;
}
