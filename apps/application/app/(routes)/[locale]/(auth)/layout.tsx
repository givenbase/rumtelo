import Link from 'next/link';

import { RumteloLogo } from '@rumtelo/brand';
import { Typography } from '@rumtelo/ui';
import { BRAND_TAGLINE } from '@rumtelo/i18n';

import { AuthAside } from './_components/auth-aside';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="grid min-h-dvh lg:grid-cols-2">
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
