import { getTranslations } from '@rumtelo/i18n';
import { TransactionsPageClient } from './_components/transactions-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('transactions') };
}

export default function TransactionsPage() {
    return <TransactionsPageClient />;
}
