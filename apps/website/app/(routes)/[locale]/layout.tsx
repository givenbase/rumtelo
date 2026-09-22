import type { Metadata, Viewport } from 'next';
import { Archivo, Archivo_Narrow, IBM_Plex_Mono } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';

import { BRAND_ASSETS, BRAND_METADATA_ICONS } from '@rumtelo/brand';
import { getTranslations, locales } from '@rumtelo/i18n';

import { Providers } from './providers';

import '../../globals.css';

/** Brand book: Tungsten (display) → Archivo Narrow web substitute; Archivo body. */
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

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations('pages.landing.meta');
    const title = t('title');
    const description = t('description');
    const keywords = t.raw('keywords') as string[];

    return {
        title,
        description,
        applicationName: 'Rumtelo',
        icons: BRAND_METADATA_ICONS,
        manifest: BRAND_ASSETS.manifest,
        appleWebApp: {
            title: 'Rumtelo',
            capable: true,
            statusBarStyle: 'default',
        },
        keywords,
        openGraph: {
            type: 'website',
            siteName: 'Rumtelo',
            title,
            description,
            locale: 'en',
            alternateLocale: ['nl'],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
        },
    };
}

export const viewport: Viewport = {
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#EEF1F5' },
        { media: '(prefers-color-scheme: dark)', color: '#1A202D' },
    ],
};

export function generateStaticParams() {
    return locales.map(locale => ({ locale }));
}

type LocaleLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default async function LocaleLayout({ children }: LocaleLayoutProps) {
    const locale = await getLocale();
    const messages = await getMessages();

    return (
        <html lang={locale} suppressHydrationWarning>
            <body
                className={`${display.variable} ${sans.variable} ${mono.variable} min-h-dvh bg-bg bg-(image:--gradient-page) font-sans text-fg antialiased`}>
                <NextIntlClientProvider locale={locale} messages={messages}>
                    <Providers>{children}</Providers>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}
