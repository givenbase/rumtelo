import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { getTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { Cta } from '@/components/landing/landing-primitives';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl, webSignUpPath } from '@/lib/portal-urls';

export type LegalTranslator = {
    (key: string): string;
    has: (key: string) => boolean;
    raw: (key: string) => unknown;
};

/** Renders title + optional body / list / closing paragraph for each section id. */
export function LegalDocSections({ t, ids }: { t: LegalTranslator; ids: readonly string[] }) {
    return (
        <>
            {ids.map(id => {
                const items = t.has(`sections.${id}.items`) ? t.raw(`sections.${id}.items`) : null;
                return (
                    <Fragment key={id}>
                        <h2>{t(`sections.${id}.title`)}</h2>
                        {t.has(`sections.${id}.body`) ? <p>{t(`sections.${id}.body`)}</p> : null}
                        {Array.isArray(items) ? (
                            <ul>
                                {items.map(item =>
                                    typeof item === 'string' ? <li key={item}>{item}</li> : null
                                )}
                            </ul>
                        ) : null}
                        {t.has(`sections.${id}.after`) ? <p>{t(`sections.${id}.after`)}</p> : null}
                    </Fragment>
                );
            })}
        </>
    );
}

export async function LegalPage({
    title,
    updated,
    children,
}: {
    title: string;
    updated: string;
    children: ReactNode;
}) {
    const t = await getTranslations('pages.legal.common');

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
                <p className="mt-2 font-mono text-xs text-fg-faint">
                    {t('last_updated', { date: updated })}
                </p>
                <div className="prose-legal mt-10 grid gap-6 text-base leading-relaxed text-fg-secondary [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg [&_p]:text-pretty [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5">
                    {children}
                </div>
                <p className="mt-12 border-t border-line pt-6 text-sm text-fg-faint">
                    {t('questions')}{' '}
                    <Link href="/support/contact" className="text-accent hover:underline">
                        {t('contact_link')}
                    </Link>
                    {' · '}
                    <Link href="/legal" className="text-accent hover:underline">
                        {t('legal_hub_link')}
                    </Link>
                    {' · '}
                    <Link href="/" className="text-accent hover:underline">
                        {t('back_home')}
                    </Link>
                </p>
            </main>
        </div>
    );
}
