import { getTranslations } from '@rumtelo/i18n';

import { CentrePickerIsland } from './_components/centre-picker-island';

export async function generateMetadata() {
    const t = await getTranslations('features.soul.centres');
    return { title: t('eyebrow') };
}

export default async function CentresPage() {
    return <CentrePickerIsland />;
}
