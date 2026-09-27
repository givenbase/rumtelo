import { getTranslations } from '@rumtelo/i18n';

import { HouseholdMembersSettings } from '../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_household') };
}

export default function HouseholdSettingsPage() {
    return <HouseholdMembersSettings />;
}
