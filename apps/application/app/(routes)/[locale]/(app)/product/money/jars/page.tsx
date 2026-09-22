import { getTranslations } from '@rumtelo/i18n';
import { JarsPageClient } from './_components/jars-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('jars') };
}

export default function JarsPage() {
    return <JarsPageClient />;
}
