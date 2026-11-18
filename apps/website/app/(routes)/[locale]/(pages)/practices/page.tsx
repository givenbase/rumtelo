import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { PracticesPage } from '@/components/practices/practices-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.practices.meta');
    const title = t('title');
    const description = t('description');

    return {
        title,
        description,
        openGraph: { type: 'website', siteName: 'Rumtelo', title, description },
        twitter: { card: 'summary_large_image', title, description },
    };
}

export default function Page() {
    return <PracticesPage />;
}
