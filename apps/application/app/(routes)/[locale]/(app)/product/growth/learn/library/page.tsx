import { getTranslations } from '@rumtelo/i18n';
import { LearnPage } from '../_components/learn-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('library') };
}

/** The recommended shelf. A page, not a tab — Learn stays the place you are working. */
export default function Page() {
    return <LearnPage view="library" />;
}
