import { Suspense } from 'react';

import { getTranslations } from '@rumtelo/i18n';

import { PlanSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_plan') };
}

export default function PlanSettingsPage() {
    return (
        <Suspense fallback={null}>
            <PlanSettings />
        </Suspense>
    );
}
