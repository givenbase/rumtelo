import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { SupportPage } from '@/components/support/support-page';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.support.legal');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('description'),
    };
}

const LEGAL_DOCS = [
    {
        key: 'privacy' as const,
        href: '/legal/privacy',
    },
    {
        key: 'terms' as const,
        href: '/legal/terms',
    },
    {
        key: 'cookies' as const,
        href: '/legal/cookies',
    },
    {
        key: 'data_processing' as const,
        href: '/legal/data-processing',
    },
    {
        key: 'company' as const,
        href: '/legal/company',
    },
] as const;

export default async function LegalHubPage() {
    const t = await getTranslations('pages.support.legal');

    return (
        <SupportPage title={t('title')} description={t('description')}>
            <div className="grid gap-4">
                {LEGAL_DOCS.map(doc => (
                    <Link
                        key={doc.key}
                        href={doc.href}
                        className="group flex flex-col gap-2 rounded-xl border border-line bg-chrome p-6 transition-colors hover:border-accent/40 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                        <span className="grid min-w-0 gap-1">
                            <span className="font-display text-lg font-semibold tracking-tight text-fg">
                                {t(`documents.${doc.key}.title`)}
                            </span>
                            <span className="text-sm leading-relaxed text-fg-secondary">
                                {t(`documents.${doc.key}.short`)}
                            </span>
                        </span>
                        <span className="shrink-0 text-sm font-medium text-accent group-hover:underline">
                            {t('read_document')} →
                        </span>
                    </Link>
                ))}
            </div>

            <div className="mt-12 flex flex-col items-start gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-fg-faint">{t('footer_kicker')}</p>
                <Link
                    href="/support/contact"
                    className="text-sm font-medium text-accent hover:underline">
                    {t('footer_contact')} →
                </Link>
            </div>
        </SupportPage>
    );
}
