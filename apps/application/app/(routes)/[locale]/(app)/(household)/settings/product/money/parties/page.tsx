import { getTranslations } from '@rumtelo/i18n';
import { PartiesSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_parties') };
}

export default function PartiesSettingsPage() {
    return <PartiesSettings />;
}
