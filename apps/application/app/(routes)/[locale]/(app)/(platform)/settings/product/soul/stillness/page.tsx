import { getTranslations } from '@rumtelo/i18n';
import { SoulSettings } from '../../../_components/settings-panels';

export async function generateMetadata() {
    const t = await getTranslations('pages.meta');
    return { title: t('settings_stillness') };
}

export default function SoulStillnessSettingsPage() {
    return <SoulSettings />;
}
