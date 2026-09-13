import type { Metadata } from 'next';

import { StatusPage } from '@rumtelo/ui';

import './globals.css';

export const metadata: Metadata = {
    title: 'Page not found · Rumtelo',
    robots: { index: false, follow: false },
};

/** Root 404 outside the locale tree — always Rumtelo StatusPage, never Next’s default. */
export default function GlobalNotFound() {
    return (
        <html lang="en">
            <body className="min-h-dvh bg-bg font-sans text-fg antialiased">
                <StatusPage
                    type="not-found"
                    statusCode={404}
                    homeHref="/"
                    homeLabel="Back to dashboard"
                />
            </body>
        </html>
    );
}
