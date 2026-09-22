import type { ReactNode } from 'react';
import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { getTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { Cta } from '@/components/landing/landing-primitives';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl, webSignUpPath } from '@/lib/portal-urls';

/** Shared chrome for public support pages (hub, legal index, contact). */
export async function SupportPage({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    const t = await getTranslations('pages.support.common');

    return (
        <div className="min-h-dvh bg-bg-app">
            <header className="border-b border-line bg-chrome">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <RumteloLogo variant="wordmark" className="h-6 w-auto max-w-34" />
                    </Link>
                    <Cta href={isRegistrationOpen() ? webSignUpPath() : appSignInUrl()}>
                        {isRegistrationOpen() ? t('start_free') : t('sign_in')}
                    </Cta>
                </div>
            </header>
            <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 lg:py-16">
                <Typography variant="eyebrow" color="primary">
                    ✦ {t('eyebrow')}
                </Typography>
                <Typography as="h1" weight="semibold" className="mt-3 text-4xl lg:text-4xl">
                    {title}
                </Typography>
                {description ? (
                    <p className="mt-3 max-w-prose text-base leading-relaxed text-pretty text-fg-secondary">
                        {description}
                    </p>
                ) : null}
                <div className="mt-10">{children}</div>
                <p className="mt-12 border-t border-line pt-6 text-sm text-fg-faint">
                    <Link href="/" className="text-accent hover:underline">
                        {t('back_home')}
                    </Link>
                </p>
            </main>
        </div>
    );
}
