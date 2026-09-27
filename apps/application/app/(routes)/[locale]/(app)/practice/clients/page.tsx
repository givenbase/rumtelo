import { getTranslations } from '@rumtelo/i18n';
import type { Metadata } from 'next';

import { PracticeClientsPage } from '../_components/practice-clients-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practice');
    return { title: t('clients.title') };
}

export default function ClientsPage() {
    return <PracticeClientsPage />;
}
