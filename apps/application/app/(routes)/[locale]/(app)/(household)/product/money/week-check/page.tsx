import { getTranslations } from '@rumtelo/i18n';
import { WeekCheckPageClient } from './_components/week-check-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('week_check') };
}

export default function WeekCheckPage() {
    return <WeekCheckPageClient />;
}
