'use client';

import { startTransition, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

import {
    DEFAULT_INTL_LOCALE,
    INTL_LOCALES,
    MESSAGE_CATALOGS,
    type IntlLocale,
} from '@rumtelo/i18n';
import { createTranslator } from 'next-intl';
import { StatusPage } from '@rumtelo/ui';

import './globals.css';

function resolveLocale(): IntlLocale {
    if (typeof document === 'undefined') return DEFAULT_INTL_LOCALE;
    const lang = document.documentElement.lang;
    return (INTL_LOCALES as readonly string[]).includes(lang)
        ? (lang as IntlLocale)
        : DEFAULT_INTL_LOCALE;
}

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const locale = resolveLocale();
    const t = useMemo(
        () => createTranslator({ locale, messages: MESSAGE_CATALOGS[locale] }),
        [locale]
    );

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
