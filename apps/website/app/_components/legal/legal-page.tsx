import type { ReactNode } from 'react';
import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { Typography } from '@rumtelo/ui';

import { Cta } from '@/components/landing/landing-primitives';
import { isRegistrationOpen } from '@/lib/maintenance';
import { appSignInUrl, webSignUpPath } from '@/lib/portal-urls';

export function LegalPage({
    title,
    updated,
    children,
}: {
    title: string;
    updated: string;
    children: ReactNode;
}) {
    return (
        <div className="min-h-dvh bg-bg-app">
            <header className="border-b border-line bg-chrome">
                <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 lg:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <RumteloLogo variant="wordmark" className="h-6 w-auto max-w-34" />
                    </Link>
                    <Cta href={isRegistrationOpen() ? webSignUpPath() : appSignInUrl()}>
                        {isRegistrationOpen() ? 'Start free' : 'Sign in'}
                    </Cta>
                </div>
            </header>
            <main className="mx-auto max-w-3xl px-4 py-12 lg:px-6 lg:py-16">
                <Typography variant="eyebrow" color="primary">
                    ✦ Legal
                </Typography>
                <Typography as="h1" weight="semibold" className="mt-3 text-4xl lg:text-4xl">
                    {title}
                </Typography>
                <p className="mt-2 font-mono text-xs text-fg-faint">Last updated · {updated}</p>
                <div className="prose-legal mt-10 grid gap-6 text-base leading-relaxed text-fg-secondary [&_h2]:mt-2 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-fg [&_p]:text-pretty [&_ul]:grid [&_ul]:list-disc [&_ul]:gap-1.5 [&_ul]:pl-5">
                    {children}
                </div>
                <p className="mt-12 border-t border-line pt-6 text-sm text-fg-faint">
                    Questions?{' '}
                    <a href="mailto:support@rumtelo.com" className="text-accent hover:underline">
                        support@rumtelo.com
                    </a>
                    {' · '}
                    <Link href="/" className="text-accent hover:underline">
                        Back to Rumtelo
                    </Link>
                </p>
            </main>
        </div>
    );
}
