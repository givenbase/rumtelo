import { getTranslations } from '@rumtelo/i18n';

import { DevicesSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_devices') };
}

export default function DevicesSettingsPage() {
    return <DevicesSettings />;
}
