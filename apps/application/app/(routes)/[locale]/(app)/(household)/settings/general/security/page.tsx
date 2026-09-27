import { getTranslations } from '@rumtelo/i18n';

import { SecuritySettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_security') };
}

export default function SecuritySettingsPage() {
    return <SecuritySettings />;
}
