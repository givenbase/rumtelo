import { getTranslations } from '@rumtelo/i18n';
import { HomeDashboardClient } from './_components/home-dashboard';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('home') };
}

export default function HomeDashboardPage() {
    return <HomeDashboardClient />;
}
