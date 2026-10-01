'use client';

import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { LocaleSwitcher, useTranslations } from '@rumtelo/i18n';
import { Typography } from '@rumtelo/ui';

import { AccountThemeToggle } from '@/components/features/shell/account-theme-sync';
import { AuthAside } from '@/components/features/brand/auth-aside';

/** Keep chrome on the form column so it never sits on the black aside. */
const chromeClass =
    'size-8 rounded-full bg-transparent text-sm text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations();

    return (
        <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <div
                className="relative flex flex-col px-5 py-4 sm:px-8 sm:py-6 lg:px-10"
                style={{ background: 'var(--gradient-page)' }}>
                <header className="flex shrink-0 items-start justify-between gap-4">
                    <Link href="/" className="inline-grid gap-1">
                        <RumteloLogo variant="wordmark" className="h-8 w-auto max-w-[11rem]" />
                        <Typography as="span" variant="caption" color="muted">
                            {t('features.brand.tagline')}
                        </Typography>
                    </Link>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <LocaleSwitcher triggerClassName="h-8 rounded-full bg-transparent px-2 text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent" />
                        <AccountThemeToggle className={chromeClass} />
                    </div>
                </header>

                <div className="flex flex-1 flex-col items-center justify-center py-8 lg:py-10">
                    <div className="w-full max-w-xl lg:max-w-2xl">{children}</div>
                </div>
            </div>

            <AuthAside />
        </div>
    );
}
