import { getTranslations } from '@rumtelo/i18n';
import { ExportSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_export') };
}

export default function ExportSettingsPage() {
    return <ExportSettings />;
}
