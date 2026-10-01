import type { Metadata } from 'next';
import Link from 'next/link';

import { getTranslations } from '@rumtelo/i18n';

import { SupportPage } from '@/components/support/support-page';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl, webSignUpPath } from '@/lib/portal-urls';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.support.spaarpotjes');
    return {
        title: `${t('title')} · Rumtelo`,
        description: t('description'),
    };
}

const SECTION_KEYS = ['what', 'jars', 'banks', 'rumtelo'] as const;

export default async function SpaarpotjesGuidePage() {
    const t = await getTranslations('pages.support.spaarpotjes');
    const tCommon = await getTranslations('pages.support.common');
    const startHref = isRegistrationOpen() ? webSignUpPath() : appSignInUrl();

    return (
        <SupportPage title={t('title')} description={t('description')}>
            <ol className="grid gap-6">
                {SECTION_KEYS.map((key, index) => (
                    <li key={key} className="grid gap-2">
                        <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
                            <span className="mr-2 font-mono text-sm text-fg-faint">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            {t(`sections.${key}.title`)}
                        </h2>
                        <p className="max-w-prose text-sm leading-relaxed text-fg-secondary">
                            {t(`sections.${key}.body`)}
                        </p>
                    </li>
                ))}
            </ol>

            <div className="mt-12 flex flex-col items-start gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
                <Link href="/support" className="text-sm font-medium text-accent hover:underline">
                    ← {t('back_support')}
                </Link>
                <Link href={startHref} className="text-sm font-medium text-accent hover:underline">
                    {isRegistrationOpen() ? t('start_cta') : tCommon('sign_in')} →
                </Link>
            </div>
        </SupportPage>
    );
}
