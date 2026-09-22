import { getTranslations } from '@rumtelo/i18n';
import { GrowthSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_goals') };
}

export default function GrowthGoalsSettingsPage() {
    return <GrowthSettings />;
}
