import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { LegalPage } from '@/components/legal/legal-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.legal.data_processing');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('intro_prefix'),
    };
}

export default async function DataProcessingPage() {
    const t = await getTranslations('pages.legal.data_processing');

    return (
        <LegalPage title={t('title')} updated={t('updated')}>
            <p>
                {t('intro_prefix')}{' '}
                <Link href="/privacy" className="text-accent hover:underline">
                    {t('privacy_link')}
                </Link>
                .
            </p>

            <h2>{t('sections.roles.title')}</h2>
            <p>{t('sections.roles.body')}</p>

            <h2>{t('sections.purposes.title')}</h2>
            <ul>
                <li>{t('sections.purposes.items.contract')}</li>
                <li>{t('sections.purposes.items.interest')}</li>
                <li>{t('sections.purposes.items.consent')}</li>
                <li>{t('sections.purposes.items.obligation')}</li>
            </ul>

            <h2>{t('sections.categories.title')}</h2>
            <p>{t('sections.categories.body')}</p>

            <h2>{t('sections.processors.title')}</h2>
            <ul>
                {(t.raw('sections.processors.items') as string[]).map(item => (
                    <li key={item}>{item}</li>
                ))}
            </ul>

            <h2>{t('sections.transfers.title')}</h2>
            <p>{t('sections.transfers.body')}</p>

            <h2>{t('sections.subprocessors.title')}</h2>
            <p>{t('sections.subprocessors.body')}</p>

            <h2>{t('sections.contact.title')}</h2>
            <p>{t('sections.contact.body')}</p>
        </LegalPage>
    );
}
