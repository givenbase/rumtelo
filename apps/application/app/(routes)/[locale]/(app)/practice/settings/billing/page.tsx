import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeBillingSettings } from '../../_components/practice-billing-settings';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('settings.tabs.billing.label') };
}

export default function PracticeSettingsBillingPage() {
    return <PracticeBillingSettings />;
}
