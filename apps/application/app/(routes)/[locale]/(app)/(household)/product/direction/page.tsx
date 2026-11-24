import { getTranslations } from '@rumtelo/i18n';

import { DirectionPage } from './_components/direction-page';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('direction') };
}

/** WHERE YOU'RE GOING — the signed-in person's own direction, in Mindset. */
export default function Page() {
    return <DirectionPage />;
}
