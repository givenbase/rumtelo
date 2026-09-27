import { getTranslations } from '@rumtelo/i18n';

import { GivingPageClient } from './_components/giving-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.nav.children');
    return { title: t('giving') };
}

export default function GivingPage() {
    return <GivingPageClient />;
}
