import { getTranslations } from '@rumtelo/i18n';
import { MoneyPortalHubClient } from '@/components/features/home/money-portal-hub';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('money') };
}

export default function MoneyPage() {
    return <MoneyPortalHubClient />;
}
