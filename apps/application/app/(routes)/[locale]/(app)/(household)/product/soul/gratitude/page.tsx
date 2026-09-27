import { getTranslations } from '@rumtelo/i18n';
import { GratitudePageClient } from './_components/gratitude-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('gratitude') };
}

export default function GratitudePage() {
    return <GratitudePageClient />;
}
