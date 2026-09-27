import { getTranslations } from '@rumtelo/i18n';
import { SoulPortalHubClient } from '@/components/features/home/soul-portal-hub';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('soul') };
}

export default function SoulPage() {
    return <SoulPortalHubClient />;
}
