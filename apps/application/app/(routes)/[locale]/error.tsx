'use client';

import { startTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { useTranslations } from '@rumtelo/i18n';
import { StatusPage } from '@rumtelo/ui';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const router = useRouter();
    const t = useTranslations();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
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
    );
}
