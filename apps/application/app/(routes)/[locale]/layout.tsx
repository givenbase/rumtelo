import type { Metadata, Viewport } from 'next';
import { Archivo, Archivo_Narrow, IBM_Plex_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { BRAND_ASSETS, BRAND_METADATA_ICONS } from '@rumtelo/brand';

import { Providers } from './providers';

import '../../globals.css';

/**
 * Brand book fonts: Archivo Narrow (Tungsten web stand-in) for display,
 * Archivo for body, IBM Plex Mono for figures. next/font self-hosts them.
 *
 * No `generateStaticParams` here: Next 16.3 fails SSG on `@modal/(...)` intercept
 * routes under `[locale]` ("Could not resolve param value for segment: locale").
 * The app is auth-gated and fine as dynamic.
 *
 * Locale comes from next-intl `requestLocale` via `i18n/request.ts` (not `setRequestLocale`).
 */
const display = Archivo_Narrow({
    subsets: ['latin'],
    weight: ['500', '600', '700'],
    variable: '--font-archivo-narrow',
    display: 'swap',
});
const sans = Archivo({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-archivo',
    display: 'swap',
});
const mono = IBM_Plex_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-plex-mono',
    display: 'swap',
});

export const metadata: Metadata = {
    title: { default: 'Rumtelo', template: '%s · Rumtelo' },
    description: 'Control that compounds. Six jars, calm weekly rhythm, room to grow.',
    applicationName: 'Rumtelo',
    icons: BRAND_METADATA_ICONS,
    manifest: BRAND_ASSETS.manifest,
    appleWebApp: {
        title: 'Rumtelo',
        capable: true,
        statusBarStyle: 'default',
    },
};

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#EEF1F5' },
        { media: '(prefers-color-scheme: dark)', color: '#1A202D' },
    ],
};

type LocaleLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default async function LocaleLayout({ children }: LocaleLayoutProps) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${display.variable} ${sans.variable} ${mono.variable} bg-bg font-sans text-fg antialiased`}>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
