import { getTranslations } from '@rumtelo/i18n';
import { ImportSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_import') };
}

export default function ImportSettingsPage() {
    return <ImportSettings />;
}
