import { getTranslations } from '@rumtelo/i18n';
import { GoalsPageClient } from './_components/goals-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('goals') };
}

export default function GoalsPage() {
    return <GoalsPageClient />;
}
