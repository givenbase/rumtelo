import { getTranslations } from '@rumtelo/i18n';
import { GoalsEntry } from './_components/goals-entry';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('goals') };
}

export default function GoalsPage() {
    return <GoalsEntry />;
}
