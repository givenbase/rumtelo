import { getTranslations } from '@rumtelo/i18n';

import { StillnessPracticeIsland } from './_components/stillness-practice-island';

export async function generateMetadata() {
    const t = await getTranslations('features.soul.stillness');
    return { title: t('eyebrow') };
}

export default async function StillnessPage() {
    return <StillnessPracticeIsland />;
}
