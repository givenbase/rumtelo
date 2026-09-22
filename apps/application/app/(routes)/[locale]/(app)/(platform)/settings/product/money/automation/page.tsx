import { getTranslations } from '@rumtelo/i18n';
import { AutomationSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_automation') };
}

export default function AutomationSettingsPage() {
    return <AutomationSettings />;
}
