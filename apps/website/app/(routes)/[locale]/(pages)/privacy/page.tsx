import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { LegalPage } from '@/components/legal/legal-page';

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

            <h2>{t('sections.who.title')}</h2>
            <p>{t('sections.who.body')}</p>

            <h2>{t('sections.collect.title')}</h2>
            <ul>
                {(t.raw('sections.collect.items') as string[]).map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>

            <h2>{t('sections.use.title')}</h2>
            <p>{t('sections.use.body')}</p>

            <h2>{t('sections.bank.title')}</h2>
            <p>{t('sections.bank.body')}</p>

            <h2>{t('sections.hosting.title')}</h2>
            <p>{t('sections.hosting.body')}</p>

            <h2>{t('sections.rights.title')}</h2>
            <p>{t('sections.rights.body')}</p>

            <h2>{t('sections.retention.title')}</h2>
            <p>{t('sections.retention.body')}</p>

            <h2>{t('sections.changes.title')}</h2>
            <p>{t('sections.changes.body')}</p>
        </LegalPage>
    );
}
