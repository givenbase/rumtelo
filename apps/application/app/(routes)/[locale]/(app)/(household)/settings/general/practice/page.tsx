import { getTranslations } from '@rumtelo/i18n';

import { PracticeLinksSettings } from '../../_components/settings-panels';
import { StartPracticeCard } from '../../_components/start-practice-card';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_practice') };
}

export default function PracticeSettingsPage() {
    return (
        <>
            <PracticeLinksSettings />
            <StartPracticeCard />
        </>
    );
}
