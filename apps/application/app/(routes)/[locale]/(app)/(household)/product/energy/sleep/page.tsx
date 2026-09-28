import { getTranslations } from '@rumtelo/i18n';

import { SleepPageClient } from './_components/sleep-page-client';

export async function generateMetadata() {
    const t = await getTranslations('features.energy.sleep');
    return { title: t('eyebrow') };
}

export default function SleepPage() {
    return <SleepPageClient />;
}
