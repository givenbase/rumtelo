import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { LegalDocSections, LegalPage, type LegalTranslator } from '@/components/legal/legal-page';

const SECTION_IDS = [
    'operator',
    'what',
    'eligibility',
    'account',
    'use',
    'content',
    'ip',
    'billing',
    'withdrawal',
    'availability',
    'third_parties',
    'disclaimers',
    'liability',
    'indemnity',
    'suspend',
    'changes',
    'law',
    'us_terms',
    'miscellaneous',
    'contact',
] as const;

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
            <LegalDocSections t={t as LegalTranslator} ids={SECTION_IDS} />
            <p>
                <Link href="/support/contact" className="text-accent hover:underline">
                    support@rumtelo.com
                </Link>
                {' · '}
                <Link href="/legal/company" className="text-accent hover:underline">
                    {t('sections.operator.title')}
                </Link>
            </p>
        </LegalPage>
    );
}
