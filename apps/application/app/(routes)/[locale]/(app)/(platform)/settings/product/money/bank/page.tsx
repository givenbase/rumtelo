import { getTranslations } from '@rumtelo/i18n';
import { BankSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_bank') };
}

export default function BankSettingsPage() {
    return <BankSettings />;
}
