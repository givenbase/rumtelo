'use client';

import { startTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import { LocalesEnum } from '@rumtelo/i18n';
import en from '@rumtelo/i18n/languages/en.json';
import nl from '@rumtelo/i18n/languages/nl.json';
import { createTranslator } from 'next-intl';
import { StatusPage } from '@rumtelo/ui';

import './globals.css';

const MESSAGES = {
    [LocalesEnum.English]: en,
    [LocalesEnum.Dutch]: nl,
} as const;

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const locale =
        typeof document !== 'undefined' && document.documentElement.lang === LocalesEnum.Dutch
            ? LocalesEnum.Dutch
            : LocalesEnum.English;
    const t = useMemo(() => createTranslator({ locale, messages: MESSAGES[locale] }), [locale]);

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <html lang={locale}>
            <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
                <StatusPage
                    type="error"
                    statusCode={500}
                    title={t('ui.statusPage.error.title')}
                    description={t('ui.statusPage.error.description')}
                    errorDetails={error.message}
                    reset={() => {
                        startTransition(() => {
                            router.refresh();
                            reset();
                        });
                    }}
                    retryLabel={t('ui.statusPage.try_again')}
                    goBackLabel={t('ui.statusPage.go_back')}
                    homeHref="/"
                    homeLabel={t('ui.statusPage.back_home')}
                />
            </body>
        </html>
    );
}
