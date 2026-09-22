import { getTranslations } from '@rumtelo/i18n';
import { JarsSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_jars') };
}

export default function JarsSettingsPage() {
    return <JarsSettings />;
}
