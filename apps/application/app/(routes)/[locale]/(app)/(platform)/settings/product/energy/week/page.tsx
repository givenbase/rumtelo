import { getTranslations } from '@rumtelo/i18n';
import { EnergySettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_week') };
}

export default function EnergyWeekSettingsPage() {
    return <EnergySettings />;
}
