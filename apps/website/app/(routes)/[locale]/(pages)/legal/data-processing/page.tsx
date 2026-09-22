import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { LegalDocSections, LegalPage, type LegalTranslator } from '@/components/legal/legal-page';

const SECTION_IDS = [
    'roles',
    'purposes',
    'categories',
    'processors',
    'measures',
    'transfers',
    'subprocessors',
    'rights',
    'contact',
] as const;

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
                <Link href="/legal/privacy" className="text-accent hover:underline">
                    {t('privacy_link')}
                </Link>
                .
            </p>
            <LegalDocSections t={t as LegalTranslator} ids={SECTION_IDS} />
        </LegalPage>
    );
}
