import { getTranslations } from '@rumtelo/i18n';
import { LearnPage } from './learn-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('learn') };
}

/** WHAT I LEARN — skills first, then the shelf we recommend and do not host. */
export default function Page() {
    return <LearnPage view="shelf" />;
}
