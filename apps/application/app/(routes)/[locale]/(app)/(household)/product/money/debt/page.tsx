import { getTranslations } from '@rumtelo/i18n';
import { DebtsPageClient } from './_components/debts-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('debts') };
}

export default function DebtsPage() {
    return <DebtsPageClient />;
}
