import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeCompanySettings } from '../../_components/practice-company-settings';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('settings.tabs.company.label') };
}

export default function PracticeSettingsCompanyPage() {
    return <PracticeCompanySettings />;
}
