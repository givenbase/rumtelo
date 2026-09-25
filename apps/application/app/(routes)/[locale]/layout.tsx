import type { Metadata, Viewport } from 'next';
import { Archivo, Archivo_Narrow, IBM_Plex_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { BRAND_ASSETS, BRAND_METADATA_ICONS } from '@rumtelo/brand';
import { getTranslations } from '@rumtelo/i18n';

import { Providers } from './providers';
import { StagingBanner } from '@/components/layout/staging-banner';

import '../../globals.css';

/**
 * Brand book fonts via `next/font/google` (Next downloads + self-hosts at build).
 * Variable faces where Google offers them — fewer gstatic fetches, Next’s recommended path.
 * latin-ext covers NL diacritics.
 *
 * No `generateStaticParams` here: Next 16.3 fails SSG on `@modal/(...)` intercept
 * routes under `[locale]` ("Could not resolve param value for segment: locale").
 * The app is auth-gated and fine as dynamic.
 *
 * Locale comes from next-intl `requestLocale` via `i18n/request.ts` (not `setRequestLocale`).
 */
const display = Archivo_Narrow({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-archivo-narrow',
    display: 'swap',
});
const sans = Archivo({
    subsets: ['latin', 'latin-ext'],
    variable: '--font-archivo',
    display: 'swap',
});
const mono = IBM_Plex_Mono({
    subsets: ['latin', 'latin-ext'],
    weight: ['400', '500', '600'],
    variable: '--font-plex-mono',
    display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.meta');
    return {
        title: { default: 'Rumtelo', template: '%s · Rumtelo' },
        description: t('app_description'),
        applicationName: 'Rumtelo',
        icons: BRAND_METADATA_ICONS,
        manifest: BRAND_ASSETS.manifest,
        appleWebApp: {
            title: 'Rumtelo',
            capable: true,
            statusBarStyle: 'default',
        },
    };
}

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
                    <StagingBanner />
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
