import { getTranslations } from '@rumtelo/i18n';
import { GrowthPortalHubClient } from '@/components/features/home/growth-portal-hub';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('growth') };
}

export default function GrowthPage() {
    return <GrowthPortalHubClient />;
}
