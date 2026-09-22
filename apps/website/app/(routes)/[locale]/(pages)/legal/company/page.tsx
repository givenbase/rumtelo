import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { LegalDocSections, LegalPage, type LegalTranslator } from '@/components/legal/legal-page';

const SECTION_IDS = ['identity', 'contact', 'hosting', 'authorities', 'regulated'] as const;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.legal.company');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('intro'),
    };
}

export default async function CompanyPage() {
    const t = await getTranslations('pages.legal.company');

    return (
        <LegalPage title={t('title')} updated={t('updated')}>
            <p>{t('intro')}</p>
            <LegalDocSections t={t as LegalTranslator} ids={SECTION_IDS} />
        </LegalPage>
    );
}
