'use client';

import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { Typography } from '@rumtelo/ui';
import { BRAND_TAGLINE } from '@rumtelo/i18n';

import { AccountThemeToggle } from '@/app/_components/account-theme-sync';

import { AuthAside } from './_components/auth-aside';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="relative grid min-h-dvh lg:grid-cols-2">
            <div className="absolute top-4 right-4 z-10 sm:top-6 sm:right-6">
                <AccountThemeToggle className="size-8 rounded-full bg-transparent text-sm text-fg-muted hover:border-accent hover:bg-transparent hover:text-accent" />
            </div>

            <div
                className="flex flex-col items-center justify-center px-6 py-12 sm:px-10"
                style={{ background: 'var(--gradient-page)' }}>
                <div className="w-full max-w-md">
                    <Link href="/" className="mb-10 inline-grid gap-1.5">
                        <RumteloLogo variant="wordmark" className="h-8 w-auto max-w-[11rem]" />
                        <Typography as="span" variant="caption" color="muted">
                            {BRAND_TAGLINE}
                        </Typography>
                    </Link>
                    {children}
                </div>
            </div>

            <AuthAside />
        </div>
    );
}
