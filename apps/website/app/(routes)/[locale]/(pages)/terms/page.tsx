import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';

import { LegalPage } from '@/components/legal/legal-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.legal.terms');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('intro'),
    };
}

export default async function TermsPage() {
    const t = await getTranslations('pages.legal.terms');

    return (
        <LegalPage title={t('title')} updated={t('updated')}>
            <p>{t('intro')}</p>

            <h2>{t('sections.what.title')}</h2>
            <p>{t('sections.what.body')}</p>

            <h2>{t('sections.account.title')}</h2>
            <ul>
                {(t.raw('sections.account.items') as string[]).map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>

            <h2>{t('sections.use.title')}</h2>
            <p>{t('sections.use.body')}</p>

            <h2>{t('sections.billing.title')}</h2>
            <p>{t('sections.billing.body')}</p>

            <h2>{t('sections.ip.title')}</h2>
            <p>{t('sections.ip.body')}</p>

            <h2>{t('sections.availability.title')}</h2>
            <p>{t('sections.availability.body')}</p>

            <h2>{t('sections.liability.title')}</h2>
            <p>{t('sections.liability.body')}</p>

            <h2>{t('sections.law.title')}</h2>
            <p>{t('sections.law.body')}</p>

            <h2>{t('sections.contact.title')}</h2>
            <p>
                <a href="mailto:support@rumtelo.com" className="text-accent hover:underline">
                    support@rumtelo.com
                </a>
            </p>
        </LegalPage>
    );
}
