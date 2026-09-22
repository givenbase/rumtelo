import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { LegalDocSections, LegalPage, type LegalTranslator } from '@/components/legal/legal-page';

const SECTION_IDS = [
    'what',
    'how',
    'necessary',
    'storage',
    'manage',
    'third',
    'changes',
    'contact',
] as const;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.legal.cookies');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('intro'),
    };
}

export default async function CookiesPage() {
    const t = await getTranslations('pages.legal.cookies');

    return (
        <LegalPage title={t('title')} updated={t('updated')}>
            <p>{t('intro')}</p>
            <LegalDocSections t={t as LegalTranslator} ids={SECTION_IDS} />
        </LegalPage>
    );
}
