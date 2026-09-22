import type { Metadata } from 'next';

import { getTranslations } from '@rumtelo/i18n';
import { StatusPage } from '@rumtelo/ui';

import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.meta');
    return {
        title: t('not_found_document'),
        robots: { index: false, follow: false },
    };
}

/** Root 404 outside the locale tree — always Rumtelo StatusPage, never Next’s default. */
export default async function GlobalNotFound() {
    const t = await getTranslations();

    return (
        <html lang="en">
            <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
                <StatusPage
                    type="not-found"
                    statusCode={404}
                    title={t('ui.statusPage.not_found.title')}
                    description={t('ui.statusPage.not_found.description')}
                    goBackLabel={t('ui.statusPage.go_back')}
                    homeHref="/"
                    homeLabel={t('ui.statusPage.back_home')}
                />
            </body>
        </html>
    );
}
