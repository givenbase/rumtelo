import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { LegalDocSections, LegalPage, type LegalTranslator } from '@/components/legal/legal-page';

const SECTION_IDS = [
    'who',
    'scope',
    'collect',
    'special',
    'sources',
    'use',
    'automated',
    'household',
    'bank',
    'cookies',
    'recipients',
    'transfers',
    'retention',
    'security',
    'rights_gdpr',
    'rights_us',
    'children',
    'changes',
    'contact',
] as const;

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.legal.privacy');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('intro'),
    };
}

export default async function PrivacyPage() {
    const t = await getTranslations('pages.legal.privacy');

    return (
        <LegalPage title={t('title')} updated={t('updated')}>
            <p>{t('intro')}</p>
            <LegalDocSections t={t as LegalTranslator} ids={SECTION_IDS} />
        </LegalPage>
    );
}
