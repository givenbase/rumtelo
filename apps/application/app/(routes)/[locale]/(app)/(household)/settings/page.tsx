import { getTranslations } from '@rumtelo/i18n';
import { AccountSettings } from './_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_account') };
}

/** Default settings landing — Account (no redirect). */
export default function SettingsPage() {
    return <AccountSettings />;
}
