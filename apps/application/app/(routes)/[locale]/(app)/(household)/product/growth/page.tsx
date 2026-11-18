import { getTranslations } from '@rumtelo/i18n';

import { GrowthEntry } from './_components/growth-entry';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('growth') };
}

/** Growth has no hub of its own: it opens on Course (Plus, Max) or Goals (Basic). */
export default function GrowthPage() {
    return <GrowthEntry />;
}
