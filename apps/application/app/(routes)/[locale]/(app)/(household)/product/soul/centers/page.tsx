import { getTranslations } from '@rumtelo/i18n';

import { CenterPickerIsland } from './_components/center-picker-island';

export async function generateMetadata() {
    const t = await getTranslations('features.soul.centers');
    return { title: t('eyebrow') };
}

export default async function CentersPage() {
    return <CenterPickerIsland />;
}
