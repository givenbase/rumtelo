import { getTranslations } from '@rumtelo/i18n';
import { DebtSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_debt') };
}

export default function DebtSettingsPage() {
    return <DebtSettings />;
}
