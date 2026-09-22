'use client';

import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { LocaleSwitcher, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { AccountThemeToggle } from '@/components/features/shell/account-theme-sync';

import { AuthAside } from './_components/auth-aside';

/** Keep chrome on the form column so it never sits on the black aside. */
const chromeClass =
    'size-8 rounded-full bg-transparent text-sm text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations();

    return (
        <div className="grid min-h-dvh lg:grid-cols-2">
            <div
                className="relative flex flex-col items-center justify-center px-6 py-12 sm:px-10"
                style={{ background: 'var(--gradient-page)' }}>
                <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 sm:top-6 sm:right-6 sm:gap-2">
                    <LocaleSwitcher triggerClassName="h-8 rounded-full bg-transparent px-2 text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent" />
                    <AccountThemeToggle className={chromeClass} />
                </div>

                <div className="w-full max-w-md">
                    <Link href="/" className="mb-10 inline-grid gap-1.5">
                        <RumteloLogo variant="wordmark" className="h-8 w-auto max-w-[11rem]" />
                        <Typography as="span" variant="caption" color="muted">
                            {t('features.brand.tagline')}
                        </Typography>
                    </Link>
                    {children}
                </div>
            </div>

            <AuthAside />
        </div>
    );
}
