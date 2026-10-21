import { getTranslations } from '@rumtelo/i18n';

import { SettingsPanel } from '../../_components/settings-chrome';
import { HouseholdSettings, SharingSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_household') };
}

export default function HouseholdSettingsPage() {
    return (
        <SettingsPanel>
            <HouseholdSettings />
            <SharingSettings />
        </SettingsPanel>
    );
}
