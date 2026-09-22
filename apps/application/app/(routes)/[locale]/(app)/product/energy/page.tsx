import { getTranslations } from '@rumtelo/i18n';
import { EnergyPortalHubClient } from '@/components/features/home/energy-portal-hub';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('energy') };
}

export default function EnergyPage() {
    return <EnergyPortalHubClient />;
}
